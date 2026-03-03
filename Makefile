.PHONY: help install build test run clean docker-up docker-down

help:
	@echo "Movie API / CineSearch - Comandos Disponíveis"
	@echo "============================================="
	@echo "install       - Instala dependências"
	@echo "build         - Compila o projeto"
	@echo "test          - Executa testes"
	@echo "run           - Executa localmente"
	@echo "clean         - Limpa arquivos de build"
	@echo "docker-up     - Inicia containers Docker"
	@echo "docker-down   - Para containers Docker"

install:
	dotnet restore
	cd frontend && npm install

build:
	dotnet build --configuration Release
	cd frontend && npm run build

test:
	dotnet test
	cd frontend && npm test

run:
	start cmd /k "cd src/MovieAPI.API && dotnet run"
	start cmd /k "cd frontend && npm run dev"

clean:
	dotnet clean
	cd frontend && rmdir /s /q dist node_modules

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down
