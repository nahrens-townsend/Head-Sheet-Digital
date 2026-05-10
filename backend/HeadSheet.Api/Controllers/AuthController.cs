using HeadSheet.Api.Models;
using HeadSheet.Api.Models.Auth;
using HeadSheet.Application.Auth;
using HeadSheet.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace HeadSheet.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController(IAuthService authService, IOptions<JwtOptions> jwtOptions) : ControllerBase
{
    private const string RefreshTokenCookie = "refresh_token";
    private readonly int _refreshDays = jwtOptions.Value.RefreshTokenExpiryDays;

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto dto, CancellationToken ct)
    {
        try
        {
            var (auth, rawToken) = await authService.RegisterAsync(
                new RegisterRequest(dto.Email, dto.Name, dto.Password), ct);
            SetRefreshCookie(rawToken);
            return Ok(ApiResponse.Ok(new AuthResponseDto(auth.AccessToken, auth.UserId, auth.Email, auth.Name)));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse.Fail<AuthResponseDto>(ex.Message));
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto dto, CancellationToken ct)
    {
        try
        {
            var (auth, rawToken) = await authService.LoginAsync(
                new LoginRequest(dto.Email, dto.Password), ct);

            SetRefreshCookie(rawToken);
            return Ok(ApiResponse.Ok(new AuthResponseDto(auth.AccessToken, auth.UserId, auth.Email, auth.Name)));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse.Fail<AuthResponseDto>(ex.Message));
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        var rawToken = Request.Cookies[RefreshTokenCookie];
        if (string.IsNullOrEmpty(rawToken))
            return Unauthorized(ApiResponse.Fail<AuthResponseDto>("No refresh token provided."));

        try
        {
            var (auth, newToken) = await authService.RefreshAsync(rawToken, ct);
            SetRefreshCookie(newToken);
            return Ok(ApiResponse.Ok(new AuthResponseDto(auth.AccessToken, auth.UserId, auth.Email, auth.Name)));
        }
        catch (UnauthorizedAccessException ex)
        {
            ClearRefreshCookie();
            return Unauthorized(ApiResponse.Fail<AuthResponseDto>(ex.Message));
        }
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var rawToken = Request.Cookies[RefreshTokenCookie];
        if (!string.IsNullOrEmpty(rawToken))
            await authService.LogoutAsync(rawToken, ct);

        ClearRefreshCookie();
        return Ok(ApiResponse.Ok<object>(new { message = "Logged out." }));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await authService.GetMeAsync(userId.Value, ct);
        if (result is null) return NotFound();

        return Ok(ApiResponse.Ok(new AuthResponseDto(string.Empty, result.UserId, result.Email, result.Name)));
    }

    private void SetRefreshCookie(string token)
    {
        Response.Cookies.Append(RefreshTokenCookie, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = HttpContext.Request.IsHttps, // false in local HTTP dev, true in production
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(_refreshDays),
        });
    }

    private void ClearRefreshCookie()
    {
        Response.Cookies.Delete(RefreshTokenCookie, new CookieOptions
        {
            HttpOnly = true,
            Secure = HttpContext.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
        });
    }

    private Guid? GetUserId()
    {
        var sub = User.Claims.FirstOrDefault(c => c.Type == "sub" ||
            c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}

