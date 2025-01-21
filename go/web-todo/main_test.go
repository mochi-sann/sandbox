package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jinzhu/gorm"
	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/assert"
)

var testDB *gorm.DB

func setupTestDB() {
	var err error
	testDB, err = gorm.Open("sqlite3", "test.db")
	if err != nil {
		panic(fmt.Sprintf("failed to connect test database: %v", err))
	}
	testDB.AutoMigrate(&Todo{})
}

func teardownTestDB() {
	testDB.Close()
	os.Remove("test.db")
}

func setupRouter() *gin.Engine {
	router := gin.Default()
	router.GET("/todos", getTodos)
	router.POST("/todos", createTodo)
	router.GET("/todos/:id", getTodo)
	router.PUT("/todos/:id", updateTodo)
	router.DELETE("/todos/:id", deleteTodo)
	return router
}

func TestGetTodos(t *testing.T) {
	setupTestDB()
	defer teardownTestDB()

	router := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/todos", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var todos []Todo
	err := json.Unmarshal(w.Body.Bytes(), &todos)
	assert.NoError(t, err)
	assert.Equal(t, 0, len(todos))
}

func TestCreateTodo(t *testing.T) {
	setupTestDB()
	defer teardownTestDB()

	router := setupRouter()

	newTodo := Todo{Title: "Test Todo", Completed: false}
	jsonValue, _ := json.Marshal(newTodo)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/todos", bytes.NewBuffer(jsonValue))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var createdTodo Todo
	err := json.Unmarshal(w.Body.Bytes(), &createdTodo)
	assert.NoError(t, err)
	assert.Equal(t, newTodo.Title, createdTodo.Title)
	assert.Equal(t, newTodo.Completed, createdTodo.Completed)
	assert.NotEqual(t, 0, createdTodo.ID)
}

func TestGetTodo(t *testing.T) {
	setupTestDB()
	defer teardownTestDB()

	router := setupRouter()

	newTodo := Todo{Title: "Test Todo", Completed: false}
	testDB.Create(&newTodo)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/todos/"+strconv.Itoa(int(newTodo.ID)), nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var fetchedTodo Todo
	err := json.Unmarshal(w.Body.Bytes(), &fetchedTodo)
	assert.NoError(t, err)
	assert.Equal(t, newTodo.Title, fetchedTodo.Title)
	assert.Equal(t, newTodo.Completed, fetchedTodo.Completed)
	assert.Equal(t, newTodo.ID, fetchedTodo.ID)
}

func TestUpdateTodo(t *testing.T) {
	setupTestDB()
	defer teardownTestDB()

	router := setupRouter()

	newTodo := Todo{Title: "Test Todo", Completed: false}
	testDB.Create(&newTodo)

	updatedTodo := Todo{Title: "Updated Todo", Completed: true, Model: gorm.Model{ID: newTodo.ID}}
	jsonValue, _ := json.Marshal(updatedTodo)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/todos/"+strconv.Itoa(int(newTodo.ID)), bytes.NewBuffer(jsonValue))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resultTodo Todo
	err := json.Unmarshal(w.Body.Bytes(), &resultTodo)
	assert.NoError(t, err)
	assert.Equal(t, updatedTodo.Title, resultTodo.Title)
	assert.Equal(t, updatedTodo.Completed, resultTodo.Completed)
	assert.Equal(t, newTodo.ID, resultTodo.ID)
}

func TestDeleteTodo(t *testing.T) {
	setupTestDB()
	defer teardownTestDB()

	router := setupRouter()

	newTodo := Todo{Title: "Test Todo", Completed: false}
	testDB.Create(&newTodo)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/todos/"+strconv.Itoa(int(newTodo.ID)), nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var result map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &result)
	assert.NoError(t, err)
	assert.Equal(t, "Todo deleted", result["message"])

	var fetchedTodo Todo
	err = testDB.First(&fetchedTodo, newTodo.ID).Error
	assert.Error(t, err)
	assert.Equal(t, "record not found", err.Error())
}
