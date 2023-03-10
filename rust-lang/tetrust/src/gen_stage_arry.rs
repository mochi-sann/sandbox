pub fn generate_array(width: usize, height: usize) -> [[usize; 13]; 21] {
    let mut array = [[0; 13]; 21];
    for i in 0..height {
        for j in 0..width {
            if i == 0 || i == height - 1 || j == 0 || j == width - 1 {
                array[i][j] = 1;
            }
        }
    }
    for i in 0..width {
        array[height - 1][i] = 1;
    }
    array
}
