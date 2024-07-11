class CommentsController < ApplicationController
  def create 
    @artcile = Article.find(prams[:article_id])
    @comment = @article.comments.create(comment_params)
     respond_to? artcile_path(@artcile)
  end

  private
      def comment_params
      params.require(:comment).permit(:commenter, :body)
    end

end
