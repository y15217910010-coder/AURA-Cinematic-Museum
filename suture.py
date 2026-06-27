import pandas as pd

# 1. 加载情感数据集 (1500部)
df_feelings = pd.read_csv('movie_feelings_dataset.csv')
df_feelings.columns = [c.strip() for c in df_feelings.columns]

# 2. 加载百万级 TMDB 数据集 (只读取需要的列，节省内存)
# 注意：文件名请改为你下载的实际文件名
cols_to_read = ['imdb_id', 'overview', 'tagline', 'genres', 'backdrop_path', 'poster_path', 'popularity']
df_tmdb_full = pd.read_csv('TMDB_movie_dataset_v11.csv', usecols=cols_to_read)

# 3. 核心：通过 imdb_id 进行缝合
# 把情感表作为主表，去百万表里找对应的元数据
df_final = pd.merge(df_feelings, df_tmdb_full, on='imdb_id', how='left')

# 4. 简单清理：填补缺失值
df_final['overview'] = df_final['overview'].fillna("No description available.")
df_final['tagline'] = df_final['tagline'].fillna("")
df_final['backdrop_path'] = df_final['backdrop_path'].fillna("")

# 5. 保存为一个轻量级的“终极数据集”
df_final.to_csv('movie_master_data.csv', index=False)
print(f"✅ 缝合完成！生成了 movie_master_data.csv，现在你可以删掉那个巨大的原始表了。")