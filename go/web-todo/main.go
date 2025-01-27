package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/jinzhu/gorm"
	_ "github.com/mattn/go-sqlite3"
	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"mochi33.com/todo/routers"
)

// type routers.Todo struct {
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
	routers.InitDB(db)
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	router := gin.Default()

	routers.SetUpRouter(router)
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))

	fmt.Println("Server is running on port " + port)
	log.Fatal(router.Run(":" + port))
}
