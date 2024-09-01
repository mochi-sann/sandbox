class RenameCommentToCommenterInComments < ActiveRecord::Migration[7.0]
  def change
    rename_column :comments, :comment, :commenter
  end
end
