.PHONY: up down api web migrate seed

up:
	docker compose -f docker/docker-compose.yml up -d

down:
	docker compose -f docker/docker-compose.yml down

api:
	cd backend && dotnet run --project HeadSheet.Api

web:
	cd frontend && npm run dev

migrate:
	cd backend && dotnet ef database update --project HeadSheet.Infrastructure --startup-project HeadSheet.Api

seed:
	cd backend && dotnet run --project HeadSheet.Api -- seed
