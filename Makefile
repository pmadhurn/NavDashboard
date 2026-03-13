.PHONY: up down restart logs logs-backend logs-frontend logs-nginx db-shell clean

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
	docker compose exec db psql -U navdashboard -d navdashboard_db

clean:
	docker compose down -v --rmi local --remove-orphans