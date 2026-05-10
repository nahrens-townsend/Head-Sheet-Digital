using HeadSheet.Domain.Entities;

namespace HeadSheet.Application.Interfaces;

public record TokenPair(string AccessToken, string RefreshToken);

public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    string HashRefreshToken(string token);
    Guid? ValidateAccessToken(string token);
}
