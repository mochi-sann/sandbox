# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_11_29_014945) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "activity_logs", force: :cascade do |t|
    t.integer "user_id", null: false
    t.string "entity_type"
    t.integer "entity_id"
    t.string "action"
    t.json "details"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_activity_logs_on_user_id"
  end

  create_table "assignments", force: :cascade do |t|
    t.integer "todo_id", null: false
    t.integer "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["todo_id"], name: "index_assignments_on_todo_id"
    t.index ["user_id"], name: "index_assignments_on_user_id"
  end

  create_table "categories", force: :cascade do |t|
    t.string "name"
    t.integer "project_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id"], name: "index_categories_on_project_id"
  end

  create_table "comments", force: :cascade do |t|
    t.integer "todo_id", null: false
    t.integer "user_id", null: false
    t.text "content"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["todo_id"], name: "index_comments_on_todo_id"
    t.index ["user_id"], name: "index_comments_on_user_id"
  end

  create_table "dependencies", force: :cascade do |t|
    t.integer "todo_id", null: false
    t.integer "depends_on_todo_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["depends_on_todo_id"], name: "index_dependencies_on_depends_on_todo_id"
    t.index ["todo_id"], name: "index_dependencies_on_todo_id"
  end

  create_table "organization_memberships", force: :cascade do |t|
    t.integer "user_id", null: false
    t.integer "organization_id", null: false
    t.string "role"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id"], name: "index_organization_memberships_on_organization_id"
    t.index ["user_id"], name: "index_organization_memberships_on_user_id"
  end

  create_table "organizations", force: :cascade do |t|
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "projects", force: :cascade do |t|
    t.string "name"
    t.text "description"
    t.integer "organization_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id"], name: "index_projects_on_organization_id"
  end

  create_table "recurring_patterns", force: :cascade do |t|
    t.integer "todo_id", null: false
    t.string "recurrence_type"
    t.integer "interval"
    t.integer "day_of_week"
    t.integer "day_of_month"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["todo_id"], name: "index_recurring_patterns_on_todo_id"
  end

  create_table "reminders", force: :cascade do |t|
    t.integer "todo_id", null: false
    t.datetime "remind_at"
    t.boolean "sent"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["todo_id"], name: "index_reminders_on_todo_id"
  end

  create_table "subtasks", force: :cascade do |t|
    t.integer "todo_id", null: false
    t.string "title"
    t.boolean "completed"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["todo_id"], name: "index_subtasks_on_todo_id"
  end

  create_table "taggings", force: :cascade do |t|
    t.integer "tag_id", null: false
    t.integer "todo_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["tag_id"], name: "index_taggings_on_tag_id"
    t.index ["todo_id"], name: "index_taggings_on_todo_id"
  end

  create_table "tags", force: :cascade do |t|
    t.string "name"
    t.string "color"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "time_entries", force: :cascade do |t|
    t.integer "user_id", null: false
    t.integer "todo_id", null: false
    t.datetime "start_time"
    t.datetime "end_time"
    t.integer "duration"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["todo_id"], name: "index_time_entries_on_todo_id"
    t.index ["user_id"], name: "index_time_entries_on_user_id"
  end

  create_table "todo_status_histories", force: :cascade do |t|
    t.integer "todo_id", null: false
    t.boolean "old_status"
    t.boolean "new_status"
    t.datetime "changed_at"
    t.integer "changed_by_user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["changed_by_user_id"], name: "index_todo_status_histories_on_changed_by_user_id"
    t.index ["todo_id"], name: "index_todo_status_histories_on_todo_id"
  end

  create_table "todos", force: :cascade do |t|
    t.string "title"
    t.boolean "completed"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "project_id"
    t.integer "category_id"
    t.index ["category_id"], name: "index_todos_on_category_id"
    t.index ["project_id"], name: "index_todos_on_project_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email"
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_foreign_key "activity_logs", "users"
  add_foreign_key "assignments", "todos"
  add_foreign_key "assignments", "users"
  add_foreign_key "categories", "projects"
  add_foreign_key "comments", "todos"
  add_foreign_key "comments", "users"
  add_foreign_key "dependencies", "todos"
  add_foreign_key "dependencies", "todos", column: "depends_on_todo_id"
  add_foreign_key "organization_memberships", "organizations"
  add_foreign_key "organization_memberships", "users"
  add_foreign_key "projects", "organizations"
  add_foreign_key "recurring_patterns", "todos"
  add_foreign_key "reminders", "todos"
  add_foreign_key "subtasks", "todos"
  add_foreign_key "taggings", "tags"
  add_foreign_key "taggings", "todos"
  add_foreign_key "time_entries", "todos"
  add_foreign_key "time_entries", "users"
  add_foreign_key "todo_status_histories", "todos"
  add_foreign_key "todo_status_histories", "users", column: "changed_by_user_id"
  add_foreign_key "todos", "categories"
  add_foreign_key "todos", "projects"
end
