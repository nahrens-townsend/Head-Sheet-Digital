using System.ComponentModel.DataAnnotations;

namespace HeadSheet.Api.Models.Auth;

public record RegisterRequestDto(
    [Required, EmailAddress, MaxLength(320)] string Email,
    [Required, MinLength(1), MaxLength(200)] string Name,
    [Required, MinLength(8)] string Password);

public record LoginRequestDto(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public record AuthResponseDto(
    string AccessToken,
    Guid UserId,
    string Email,
    string Name);
