namespace HeadSheet.Application.Interfaces;

public record RegisterRequest(string Email, string Name, string Password);
public record LoginRequest(string Email, string Password);
public record AuthResult(string AccessToken, Guid UserId, string Email, string Name);

public interface IAuthService
{
    Task<(AuthResult Auth, string RefreshToken)> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<(AuthResult Auth, string RefreshToken)> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<(AuthResult Auth, string RefreshToken)> RefreshAsync(string refreshToken, CancellationToken ct = default);
    Task LogoutAsync(string refreshToken, CancellationToken ct = default);
    Task<AuthResult?> GetMeAsync(Guid userId, CancellationToken ct = default);
}
