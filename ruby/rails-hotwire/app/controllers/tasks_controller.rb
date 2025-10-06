class TasksController < ApplicationController
  before_action :set_task, only: %i[edit update destroy toggle]

  def index
    @task = Task.new
    @tasks = Task.order(created_at: :desc)
  end

  def create
    @task = Task.new(task_params)

    if @task.save
      respond_to do |format|
        format.turbo_stream { flash.now[:notice] = "タスクを追加しました" }
        format.html { redirect_to tasks_path, notice: "タスクを追加しました" }
      end
    else
      @tasks = Task.order(created_at: :desc)

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
        format.html { redirect_to tasks_path, notice: "タスクを更新しました" }
      end
    else
      respond_to do |format|
        format.turbo_stream { render :update_failed, status: :unprocessable_entity }
        format.html { render :edit, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @task.destroy

    respond_to do |format|
      format.turbo_stream { flash.now[:notice] = "タスクを削除しました" }
      format.html { redirect_to tasks_path, notice: "タスクを削除しました" }
    end
  end

  def toggle
    @task.update(completed: !@task.completed?)

    respond_to do |format|
      message = @task.completed? ? "タスクを完了にしました" : "タスクを未完了に戻しました"
      format.turbo_stream { flash.now[:notice] = message }
      format.html { redirect_to tasks_path, notice: message }
    end
  end

  private

  def set_task
    @task = Task.find(params[:id])
  end

  def task_params
    params.require(:task).permit(:title, :description)
  end
end
