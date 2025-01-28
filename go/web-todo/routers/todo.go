package routers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jinzhu/gorm"
)

var db *gorm.DB

type Todo struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
	DeletedAt *time.Time `json:"deletedAt" gorm:"index"`
	Title     string     `json:"title"`
	Completed bool       `json:"completed"`
}

func InitDB(database *gorm.DB) {
	db = database
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

// @Summary		Create a new todo
// @Description	Create a new todo
// @Accept			json
// @Produce		json
// @Param			todo	body		routers.Todo	true	"Todo object"
// @Success		201		{object}	routers.Todo
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
// @Summary		Ping
// @Description	Ping
// @Produce		json
// @Success		200	{object}	map[string]string
// @Router			/ping [get]
func ping(c *gin.Context) {
  c.JSON(http.StatusOK, gin.H{
    "message": "pong!!!!!!!!!!!",
  })

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

func SetUpRouter(router *gin.Engine) {
	v1 := router.Group("/api/v1")
	{
		v1.GET("/ping", ping)

		// /todos グループ
		todos := v1.Group("/todos")
		{
			todos.GET("", getTodos)
			todos.POST("", createTodo)
			todos.GET("/:id", getTodo)
			todos.PUT("/:id", updateTodo)
			todos.DELETE("/:id", deleteTodo)
		}
	}
}
