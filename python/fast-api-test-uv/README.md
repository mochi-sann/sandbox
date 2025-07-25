# FastAPI Todo API

A simple Todo API built with FastAPI, featuring OpenAPI documentation and comprehensive testing.

## Features

-  Full CRUD operations for todos
-  Todo status management (todo, in_progress, done)
-  OpenAPI/Swagger documentation
-  Comprehensive test coverage
-  Docker support
- ✅ Binary distribution support
-  Input validation with Pydantic

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root endpoint |
| GET | `/todos` | Get all todos (with optional status filter) |
| GET | `/todos/{id}` | Get todo by ID |
| POST | `/todos` | Create new todo |
| PUT | `/todos/{id}` | Update todo |
| DELETE | `/todos/{id}` | Delete todo |

## Data Models

### Todo Status
- `todo` - Not started
- `in_progress` - Work in progress
- `done` - Completed

### Todo Schema
```json
{
  "id": 1,
  "title": "Sample Todo",
  "description": "Optional description",
  "status": "todo",
  "created_at": "2024-01-01T12:00:00",
  "updated_at": "2024-01-01T12:00:00"
}
```

## Local Development

### Prerequisites
- Python 3.12+
- [uv](https://docs.astral.sh/uv/) package manager

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd fast-api-test-uv

# Install dependencies
uv sync

# Run the application
uv run uvicorn main:app --reload

# Run tests
uv run pytest test_main.py -v
```

The API will be available at:
- Application: http://localhost:8000
- OpenAPI docs: http://localhost:8000/docs  
- ReDoc: http://localhost:8000/redoc

## Docker Usage

### Build and Run with Docker

```bash
# Build the Docker image
docker build -t todo-api .

# Run the container
docker run -p 8000:8000 todo-api
```

### Using Docker Compose

#### Development Mode
```bash
# Start with volume mounting for development
docker-compose up todo-api

# Run in background
docker-compose up -d todo-api
```

#### Production Mode
```bash
# Start production service
docker-compose --profile production up todo-api-prod

# Run in background
docker-compose --profile production up -d todo-api-prod
```

#### Useful Docker Compose Commands
```bash
# View logs
docker-compose logs todo-api

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build todo-api

# Run tests in container
docker-compose exec todo-api uv run pytest test_main.py -v
```

### Health Check
The application includes a health check endpoint. You can verify the service is running:

```bash
curl http://localhost:8000/
```

## API Usage Examples

### Create a Todo
```bash
curl -X POST "http://localhost:8000/todos" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn FastAPI",
    "description": "Build a todo API with FastAPI",
    "status": "todo"
  }'
```

### Get All Todos
```bash
curl "http://localhost:8000/todos"
```

### Filter Todos by Status
```bash
curl "http://localhost:8000/todos?status=in_progress"
```

### Update a Todo
```bash
curl -X PUT "http://localhost:8000/todos/1" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "done"
  }'
```

### Delete a Todo
```bash
curl -X DELETE "http://localhost:8000/todos/1"
```

## Binary Distribution

Create a standalone executable that doesn't require Python installation:

### Build Binary
```bash
# Install dependencies and build binary
uv sync
python build.py

# Or build manually with PyInstaller
uv run pyinstaller todo-api.spec
```

### Run Binary
```bash
# Linux/macOS
./dist/todo-api

# Windows
.\dist\todo-api.exe
```

The binary includes all dependencies and can run on systems without Python installed. It will start the API server on http://localhost:8000.

### Binary Features
- Single executable file
- No Python installation required
- Includes all dependencies
- Cross-platform compatible
- Optimized with UPX compression

## Testing

Run the test suite:
```bash
# Local testing
uv run pytest test_main.py -v

# Docker testing
docker-compose exec todo-api uv run pytest test_main.py -v
```

The test suite covers:
- CRUD operations
- Error handling
- Input validation
- Status filtering
- Edge cases

## Project Structure

```
fast-api-test-uv/
 main.py              # FastAPI application
 models.py            # Pydantic models
 test_main.py         # Test suite
├── build.py             # Binary build script
├── todo-api.spec        # PyInstaller configuration
 pyproject.toml       # Project configuration
 uv.lock             # Dependency lock file
 Dockerfile          # Docker configuration
 docker-compose.yml  # Docker Compose configuration
 .dockerignore       # Docker ignore file
 README.md           # This file
```

## Technologies Used

- **FastAPI** - Modern, fast web framework for Python
- **Pydantic** - Data validation using Python type annotations
- **Uvicorn** - ASGI server implementation
- **pytest** - Testing framework
- **httpx** - HTTP client for testing
- **uv** - Fast Python package manager
- **Docker** - Containerization
- **PyInstaller** - Python application bundling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License.
