class ArticlesController < ApplicationController
  def index
    @articles = Article.all
  end

  def show
    @articles = Article.find(params[:id])
  end

  def new
    @articles = Article.new
  end

  def create
    @articles = Article.new(title: 'title', body: 'body')
    if @article.save
      redirect_to @article
    else
      render :new, status: unprocessable_entity
    end
  end
end
