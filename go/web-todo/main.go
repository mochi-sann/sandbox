// @title			Todo API
// @version		1.0
// @description	This is a sample Todo API.
// @host			localhost:8080
// @BasePath		/
package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jinzhu/gorm"
	_ "github.com/mattn/go-sqlite3"
	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

type Todo struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
	DeletedAt *time.Time `json:"deletedAt" gorm:"index"`
	Title     string     `json:"title"`
	Completed bool       `json:"completed"`
}

// type Todo struct {
// 	gorm.Model
// 	Title     string `json:"title"`
// 	Completed bool   `json:"completed"`
// }

var db *gorm.DB

func init() {
	var err error
	db, err = gorm.Open("sqlite3", "todo.db")
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}
	db.AutoMigrate(&Todo{})
}

// @Summary		Get all todos
// @Description	Get all todos
// @Produce		json
// @Success		200	{array}	Todo
// @Router			/todos [get]
func getTodos(c *gin.Context) {
	var todos []Todo
	db.Find(&todos)
	c.JSON(http.StatusOK, todos)
}

// @Summary		Ping
// @Description	Ping
// @Produce		json
// @Success		200	{object}	map[string]string
// @Router			/ping [get]
func ping(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "hoge",
	})

}

// @Summary		Create a new todo
// @Description	Create a new todo
// @Accept			json
// @Produce		json
// @Param			todo	body		Todo	true	"Todo object"
// @Success		201		{object}	Todo
// @Failure		400		{object}	map[string]string
// @Router			/todos [post]
func createTodo(c *gin.Context) {
	var todo Todo
	if err := c.ShouldBindJSON(&todo); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.Create(&todo)
	c.JSON(http.StatusCreated, todo)
}

// @Summary		Get a todo by ID
// @Description	Get a todo by ID
// @Produce		json
// @Param			id	path		int	true	"Todo ID"
// @Success		200	{object}	Todo
// @Failure		404	{object}	map[string]string
// @Router			/todos/{id} [get]
func getTodo(c *gin.Context) {
	id := c.Param("id")
	var todo Todo
	if err := db.First(&todo, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
		return
	}
	c.JSON(http.StatusOK, todo)
}

// @Summary		Update a todo by ID
// @Description	Update a todo by ID
// @Accept			json
// @Produce		json
// @Param			id		path		int		true	"Todo ID"
// @Param			todo	body		Todo	true	"Todo object"
// @Success		200		{object}	Todo
// @Failure		400		{object}	map[string]string
// @Failure		404		{object}	map[string]string
// @Router			/todos/{id} [put]
func updateTodo(c *gin.Context) {
	id := c.Param("id")
	var todo Todo
	if err := db.First(&todo, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
		return
	}
	if err := c.ShouldBindJSON(&todo); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.Save(&todo)
	c.JSON(http.StatusOK, todo)
}

// @Summary		Delete a todo by ID
// @Description	Delete a todo by ID
// @Produce		json
// @Param			id	path		int	true	"Todo ID"
// @Success		200	{object}	map[string]string
// @Failure		404	{object}	map[string]string
// @Router			/todos/{id} [delete]
func deleteTodo(c *gin.Context) {
	id := c.Param("id")
	var todo Todo
	if err := db.First(&todo, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
		return
	}
	db.Delete(&todo)
	c.JSON(http.StatusOK, gin.H{"message": "Todo deleted"})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	router := gin.Default()

	router.GET("/todos", getTodos)
	router.POST("/todos", createTodo)
	router.GET("/todos/:id", getTodo)
	router.PUT("/todos/:id", updateTodo)
	router.DELETE("/todos/:id", deleteTodo)
	router.GET("/ping", ping)
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))

	fmt.Println("Server is running on port " + port)
	log.Fatal(router.Run(":" + port))
}
