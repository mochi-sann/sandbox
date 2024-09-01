class RenameBotyToBodyInComments < ActiveRecord::Migration[7.0]
  def change
    rename_column :comments, :boty, :body
  end
end
