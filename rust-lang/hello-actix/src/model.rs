use actix_web::web::Json;
use sqlx::PgPool;
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct NewTodo {
    pub text: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Todos {
    pub id: i64,
    pub text: String,
    pub complated: bool,
}

impl Todos {
    pub async fn all(connection: &PgPool) -> Result<Vec<Todos>, sqlx::Error> {
        let recs = sqlx::query_as!(
            Todos,
            r#"
            SELECT * 
            FROM todos
            ORDER BY id
        "#
        )
        .fetch_all(connection)
        .await?;

        Ok(recs)
    }
    pub async fn create(new_todo: NewTodo, connection: &PgPool) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            INSERT INTO todos (text)
            VALUES ($1)
            "#,
            new_todo.text
        )
        .execute(connection)
        .await?;

        Ok(())
    }
    pub async fn delete(id: i32, connection: &PgPool) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            DELETE FROM todos
            WHERE id = $1
            "#,
            id
        )
        .execute(connection)
        .await?;
        Ok(())
    }
    pub async fn update_checks(id: i32, connection: &PgPool) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            UPDATE todos
            SET complated = NOT complated
            WHERE id = $1
            "#,
            id
        )
        .execute(connection)
        .await?;
        Ok(())
    }
    pub async fn update_text(
        id: i32,
        text: String,
        connection: &PgPool,
    ) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            UPDATE todos
            SET text = $1
            WHERE id = $2
            "#,
            text,
            id
        )
        .execute(connection)
        .await?;
        Ok(())
    }
    pub async fn find_id(id: i32, connection: &PgPool) -> Result<Todos, sqlx::Error> {
        let rec = sqlx::query_as!(
            Todos,
            r#"
            SELECT * 
            FROM todos
            WHERE id = $1
            "#,
            id
        )
        .fetch_one(connection)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => sqlx::Error::RowNotFound,
            _ => e,
        })?;

        println!("{:?}", rec);
        Ok(rec)
    }
}
