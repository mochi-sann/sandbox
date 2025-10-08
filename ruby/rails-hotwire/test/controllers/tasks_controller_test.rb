require "test_helper"

class TasksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @task = tasks(:one)
    @completed_task = tasks(:two)
  end

  test "index returns tasks with pagination metadata" do
    get tasks_url(format: :json)
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal Task.count, body.fetch("meta").fetch("totalCount")
    assert_equal Task.count, body.fetch("tasks").size
    assert body.fetch("tasks").first.key?("createdAt")
  end

  test "index filters by status" do
    get tasks_url(format: :json), params: { status: "completed" }

    assert_response :success
    body = JSON.parse(response.body)
    assert body.fetch("tasks").all? { |task| task.fetch("completed") }

    get tasks_url(format: :json), params: { status: "active" }

    assert_response :success
    body = JSON.parse(response.body)
    assert body.fetch("tasks").all? { |task| task.fetch("completed") == false }
  end

  test "index filters by query" do
    get tasks_url(format: :json), params: { query: "説明その2" }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal [@completed_task.title], body.fetch("tasks").map { |task| task.fetch("title") }
  end

  test "create returns created task as json" do
    assert_difference("Task.count") do
      post tasks_url(format: :json), params: { task: { title: "新しいタスク", description: "詳細" } }
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "新しいタスク", body.fetch("title")
    assert body.key?("id")
  end

  test "create returns validation errors" do
    assert_no_difference("Task.count") do
      post tasks_url(format: :json), params: { task: { title: "" } }
    end

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_includes body.fetch("errors"), "Title can't be blank"
  end

  test "toggle flips completed state" do
    patch toggle_task_url(@task, format: :json)

    assert_response :success
    body = JSON.parse(response.body)
    assert body.fetch("completed")
  end
end
