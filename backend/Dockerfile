FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["HeadSheet.Api/HeadSheet.Api.csproj", "HeadSheet.Api/"]
COPY ["HeadSheet.Application/HeadSheet.Application.csproj", "HeadSheet.Application/"]
COPY ["HeadSheet.Domain/HeadSheet.Domain.csproj", "HeadSheet.Domain/"]
COPY ["HeadSheet.Infrastructure/HeadSheet.Infrastructure.csproj", "HeadSheet.Infrastructure/"]
RUN dotnet restore "HeadSheet.Api/HeadSheet.Api.csproj"

COPY . .
RUN dotnet publish "HeadSheet.Api/HeadSheet.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "HeadSheet.Api.dll"]
