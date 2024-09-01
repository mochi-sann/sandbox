class CommentsController < ApplicationController
  def create
    @artcile = Article.find(params[:article_id])
    if @article.nil?
      flash[:alert] = "記事が見つかりませんでした。"
      redirect_to artcile_path
      return
    end

    @comment = @article.comments.create(comment_params)
   respond_to? artcile_path(@artcile)
  end

  private
      def comment_params
      params.require(:comment).permit(:commenter, :body)
    end

end
