class DashboardController < ApplicationController
  def index
    @todos = Todo.includes(:project, :tags, :assignments).order(created_at: :desc).limit(20)
    @projects = Project.all.limit(5)
    @recent_activities = ActivityLog.order(created_at: :desc).limit(5)
  end
end
