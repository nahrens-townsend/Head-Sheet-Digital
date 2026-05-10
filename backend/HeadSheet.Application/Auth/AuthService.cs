using HeadSheet.Application.Interfaces;
using HeadSheet.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HeadSheet.Application.Auth;

public class AuthService(IAppDbContext db, IPasswordHasher passwordHasher, ITokenService tokenService, IOptions<JwtOptions> options) : IAuthService
{
    private readonly int _refreshTokenExpiryDays = options.Value.RefreshTokenExpiryDays;

    private static string NormalizeEmail(string email) => email.ToLowerInvariant().Trim();

    public async Task<(AuthResult Auth, string RefreshToken)> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var email = NormalizeEmail(request.Email);

        var exists = await db.Users.AnyAsync(u => u.Email == email, ct);
        if (exists)
            throw new InvalidOperationException("An account with that email already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Name = request.Name.Trim(),
            PasswordHash = passwordHasher.Hash(request.Password),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.Users.Add(user);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Unique constraint race: two concurrent registrations with same email
            throw new InvalidOperationException("An account with that email already exists.");
        }

        var (auth, rawToken) = await IssueTokensAsync(user, ct);
        return (auth, rawToken);
    }

    public async Task<(AuthResult Auth, string RefreshToken)> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var email = NormalizeEmail(request.Email);

        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        var (auth, rawToken) = await IssueTokensAsync(user, ct);
        return (auth, rawToken);
    }

    public async Task<(AuthResult Auth, string RefreshToken)> RefreshAsync(string refreshToken, CancellationToken ct = default)
    {
        var tokenHash = tokenService.HashRefreshToken(refreshToken);

        var stored = await db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, ct);

        if (stored is null)
            throw new UnauthorizedAccessException("Invalid refresh token.");

        if (stored.IsRevoked)
        {
            // Reuse detected: revoke all active tokens for this user (full session revocation)
            await db.RefreshTokens
                .Where(rt => rt.UserId == stored.UserId && rt.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(rt => rt.RevokedAt, DateTime.UtcNow), ct);
            throw new UnauthorizedAccessException("Refresh token has already been used. All sessions revoked.");
        }

        if (stored.IsExpired)
            throw new UnauthorizedAccessException("Refresh token has expired. Please log in again.");

        // Atomic revoke: only one concurrent caller wins (ExecuteUpdateAsync = single UPDATE statement)
        var affected = await db.RefreshTokens
            .Where(rt => rt.TokenHash == tokenHash && rt.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(rt => rt.RevokedAt, DateTime.UtcNow), ct);

        if (affected == 0)
            throw new UnauthorizedAccessException("Invalid refresh token.");

        if (stored.User is null)
            throw new UnauthorizedAccessException("User account not found or has been deleted.");

        var (auth, rawToken) = await IssueTokensAsync(stored.User, ct);
        return (auth, rawToken);
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        var tokenHash = tokenService.HashRefreshToken(refreshToken);
        await db.RefreshTokens
            .Where(rt => rt.TokenHash == tokenHash && rt.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(rt => rt.RevokedAt, DateTime.UtcNow), ct);
    }

    public async Task<AuthResult?> GetMeAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return null;
        return new AuthResult(string.Empty, user.Id, user.Email, user.Name);
    }

    private async Task<(AuthResult Auth, string RawToken)> IssueTokensAsync(User user, CancellationToken ct)
    {
        var rawToken = tokenService.GenerateRefreshToken();
        var tokenHash = tokenService.HashRefreshToken(rawToken);

        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(_refreshTokenExpiryDays),
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);

        var accessToken = tokenService.GenerateAccessToken(user);
        return (new AuthResult(accessToken, user.Id, user.Email, user.Name), rawToken);
    }
}
