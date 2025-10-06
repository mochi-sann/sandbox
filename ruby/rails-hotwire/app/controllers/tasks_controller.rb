class TasksController < ApplicationController
  before_action :set_task, only: %i[edit update destroy toggle]
  before_action :prepare_pagination, only: %i[index create edit update destroy toggle]

  def index
    @task = Task.new
    load_tasks
  end

  def create
    @task = Task.new(task_params)

    if @task.save
      @page = 1
      load_tasks
      respond_to do |format|
        format.turbo_stream { flash.now[:notice] = "タスクを追加しました" }
        format.html { redirect_to tasks_path(page: @page), notice: "タスクを追加しました" }
      end
    else
      load_tasks

      respond_to do |format|
        format.turbo_stream { render :create_failed, status: :unprocessable_entity }
        format.html { render :index, status: :unprocessable_entity }
      end
    end
  end

  def edit
  end

  def update
    if @task.update(task_params)
      respond_to do |format|
        format.turbo_stream { flash.now[:notice] = "タスクを更新しました" }
        format.html { redirect_to tasks_path(page: @page), notice: "タスクを更新しました" }
      end
    else
      load_tasks

      respond_to do |format|
        format.turbo_stream { render :update_failed, status: :unprocessable_entity }
        format.html { render :edit, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @task.destroy
    load_tasks

    respond_to do |format|
      format.turbo_stream { flash.now[:notice] = "タスクを削除しました" }
      format.html { redirect_to tasks_path(page: @page), notice: "タスクを削除しました" }
    end
  end

  def toggle
    @task.update(completed: !@task.completed?)

    respond_to do |format|
      message = @task.completed? ? "タスクを完了にしました" : "タスクを未完了に戻しました"
      format.turbo_stream { flash.now[:notice] = message }
      format.html { redirect_to tasks_path(page: @page), notice: message }
    end
  end

  private

  PER_PAGE = 5

  def set_task
    @task = Task.find(params[:id])
  end

  def prepare_pagination
    @page = params.fetch(:page, 1).to_i
    @page = 1 if @page < 1
  end

  def load_tasks
    @total_count = Task.count
    @total_pages = (@total_count.to_f / PER_PAGE).ceil
    @page = @total_pages if @total_pages.positive? && @page > @total_pages
    @page = 1 if @total_pages.zero?

    offset = (@page - 1) * PER_PAGE
    @tasks = Task.order(created_at: :desc).offset(offset).limit(PER_PAGE)
  end

  def task_params
    params.require(:task).permit(:title, :description)
  end
end
