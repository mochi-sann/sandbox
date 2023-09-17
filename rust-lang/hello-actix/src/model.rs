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
        "#,
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
}
