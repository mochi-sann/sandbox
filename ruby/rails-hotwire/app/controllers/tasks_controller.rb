class TasksController < ApplicationController
  before_action :set_task, only: %i[edit update destroy toggle]
  before_action :prepare_filters, only: %i[index create update destroy toggle]
  before_action :prepare_pagination, only: %i[index create update destroy toggle]

  def index
    load_tasks

    respond_to do |format|
      format.html
      format.json { render json: tasks_index_payload }
    end
  end

  def create
    @task = Task.new(task_params)

    if @task.save
      respond_to do |format|
        format.turbo_stream do
          @page = 1
          load_tasks
          flash.now[:notice] = "タスクを追加しました"
        end
        format.html do
          @page = 1
          load_tasks
          redirect_to tasks_path(page: @page), notice: "タスクを追加しました"
        end
        format.json { render json: task_payload(@task), status: :created }
      end
    else
      respond_to do |format|
        format.turbo_stream do
          load_tasks
          render :create_failed, status: :unprocessable_entity
        end
        format.html do
          load_tasks
          render :index, status: :unprocessable_entity
        end
        format.json { render json: { errors: @task.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def edit; end

  def update
    if @task.update(task_params)
      respond_to do |format|
        format.turbo_stream { flash.now[:notice] = "タスクを更新しました" }
        format.html { redirect_to tasks_path(page: @page), notice: "タスクを更新しました" }
        format.json { render json: task_payload(@task), status: :ok }
      end
    else
      respond_to do |format|
        format.turbo_stream do
          load_tasks
          render :update_failed, status: :unprocessable_entity
        end
        format.html do
          load_tasks
          render :edit, status: :unprocessable_entity
        end
        format.json { render json: { errors: @task.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @task.destroy

    respond_to do |format|
      format.turbo_stream do
        load_tasks
        flash.now[:notice] = "タスクを削除しました"
      end
      format.html do
        load_tasks
        redirect_to tasks_path(page: @page), notice: "タスクを削除しました"
      end
      format.json { head :no_content }
    end
  end

  def toggle
    @task.update(completed: !@task.completed?)

    respond_to do |format|
      message = @task.completed? ? "タスクを完了にしました" : "タスクを未完了に戻しました"
      format.turbo_stream { flash.now[:notice] = message }
      format.html { redirect_to tasks_path(page: @page), notice: message }
      format.json { render json: task_payload(@task), status: :ok }
    end
  end

  private

  PER_PAGE = 5

  def prepare_filters
    @status = params[:status].presence_in(%w[all active completed]) || "all"
    @query = params[:query].to_s.strip.presence
  end

  def prepare_pagination
    @page = params.fetch(:page, 1).to_i
    @page = 1 if @page < 1
  end

  def base_scope
    scope = Task.all
    if @query
      normalized = "%#{@query.downcase}%"
      scope = scope.where("LOWER(title) LIKE :query OR LOWER(COALESCE(description, '')) LIKE :query", query: normalized)
    end

    case @status
    when "active"
      scope = scope.where(completed: false)
    when "completed"
      scope = scope.where(completed: true)
    end

    scope
  end

  def load_tasks
    scope = base_scope.order(created_at: :desc)

    @total_count = scope.count
    @total_pages = (@total_count.to_f / PER_PAGE).ceil
    @page = @total_pages if @total_pages.positive? && @page > @total_pages
    @page = 1 if @total_pages.zero?

    offset = (@page - 1) * PER_PAGE
    @tasks = scope.offset(offset).limit(PER_PAGE)
  end

  def pagination_meta
    {
      page: @page,
      perPage: PER_PAGE,
      totalPages: @total_pages,
      totalCount: @total_count
    }
  end

  def tasks_index_payload
    {
      tasks: @tasks.map { |task| task_payload(task) },
      meta: pagination_meta
    }
  end

  def task_payload(task)
    {
      id: task.id,
      title: task.title,
      description: task.description,
      completed: task.completed?,
      createdAt: task.created_at.iso8601,
      updatedAt: task.updated_at.iso8601
    }
  end

  def set_task
    @task = Task.find(params[:id])
  end

  def task_params
    params.require(:task).permit(:title, :description)
  end
end
