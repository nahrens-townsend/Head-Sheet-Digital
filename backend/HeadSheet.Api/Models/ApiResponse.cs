namespace HeadSheet.Api.Models;

public record ApiResponse<T>(bool Success, T? Data, string? Error)
{
    public static ApiResponse<T> Ok(T data) => new(true, data, null);
    public static ApiResponse<T> Fail(string error) => new(false, default, error);
}

public static class ApiResponse
{
    public static ApiResponse<T> Ok<T>(T data) => ApiResponse<T>.Ok(data);
    public static ApiResponse<T> Fail<T>(string error) => ApiResponse<T>.Fail(error);
}
