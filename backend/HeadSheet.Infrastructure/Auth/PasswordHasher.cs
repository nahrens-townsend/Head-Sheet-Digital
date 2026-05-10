using HeadSheet.Application.Interfaces;
using BC = BCrypt.Net.BCrypt;

namespace HeadSheet.Infrastructure.Auth;

public class PasswordHasher : IPasswordHasher
{
    private const int WorkFactor = 12;

    public string Hash(string password) =>
        BC.HashPassword(password, WorkFactor);

    public bool Verify(string password, string hash) =>
        BC.Verify(password, hash);
}
