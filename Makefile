.PHONY: up down restart logs logs-backend logs-frontend logs-nginx db-shell migrate migrate-status db-backup clean

up:
	docker compose up -d --build

down:
	docker compose down

restart: down up

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

logs-nginx:
	docker compose logs -f nginx

db-shell:
	docker compose exec db psql -U navdashboard -d navdashboard

# Apply pending Alembic migrations. Required after any pull that adds a
# migration: the containers do not run this on startup, and the ORM will 500 on
# every query against a table whose columns have not been created yet.
migrate:
	docker compose exec backend alembic upgrade head

migrate-status:
	docker compose exec backend alembic current
	docker compose exec backend alembic heads

db-backup:
	docker compose exec db pg_dump -U navdashboard -d navdashboard -f /backups/backup_$$(date +%Y%m%d_%H%M%S).sql

clean:
	docker compose down -v --rmi local --remove-orphans