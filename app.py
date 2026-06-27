import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import random
import math

app = Flask(__name__, static_url_path='/static', static_folder='static')
CORS(app)

# --- 1. 数据加载与智能列名锁定 ---
# 使用增强版数据集 (包含 x, y 坐标和 main_color)
DATA_FILE = 'movie_enriched_data.csv'

joy_col = sad_col = fear_col = surp_col = angr_col = None
df = None

try:
    if os.path.exists(DATA_FILE):
        df = pd.read_csv(DATA_FILE)
    else:
        # 备选方案：如果还没运行 enrich 脚本，先用旧的，防止报错
        df = pd.read_csv('movie_master_data.csv')
    
    df.columns = [c.strip() for c in df.columns]
    
    # 自动处理缺失值与数据类型
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].fillna(0)
        else:
            df[col] = df[col].fillna("Unknown")

    all_cols = df.columns.tolist()
    # 自动锁定 5 大核心维度列名
    joy_col = next((c for c in all_cols if 'happi' in c.lower() or 'joy' in c.lower()), None)
    sad_col = next((c for c in all_cols if 'sadness' in c.lower() or 'despair' in c.lower()), None)
    fear_col = next((c for c in all_cols if 'fear' in c.lower()), None)
    surp_col = next((c for c in all_cols if 'surpris' in c.lower()), None)
    angr_col = next((c for c in all_cols if 'anger' in c.lower()), None)
    
    print(f"✅ 数据加载成功。当前记录数: {len(df)}")
except Exception as e:
    print(f"❌ 数据加载失败: {e}")

# --- 2. 核心路由 ---

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

# 电影列表 API (带筛选)
# app.py

@app.route('/api/movies')
def get_movies():
    target_year = request.args.get('year')
    min_rating = request.args.get('rating', type=float, default=0)
    target_genre = request.args.get('genre')
    
    f_df = df.copy()
    if target_year and target_year != 'All':
        f_df = f_df[f_df['year'].astype(str).str.contains(target_year)]
    if min_rating > 0:
        f_df = f_df[f_df['avg_rating'].astype(float) >= min_rating]
        
    if target_genre and target_genre != 'All':
        # 自动定位类型列（兼容 genre 或 genres）
        g_col = next((c for c in f_df.columns if 'genre' in c.lower()), None)
        if g_col:
            f_df = f_df[f_df[g_col].astype(str).str.contains(target_genre, case=False, na=False)]
    
    # 【关键修复】：必须包含 poster_path，否则筛选后 3D 球体会报错
    return jsonify(f_df[['title', 'imdb_id', 'year', 'avg_rating', 'poster_path']].head(200).to_dict(orient='records'))


@app.route('/api/genres')
def get_genres():
    return jsonify(["Action", "Adventure", "Animation", "Comedy", "Crime", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Thriller"])

# 详情页 API (包含新增的颜色字段)
@app.route('/api/movie_detail')
def get_movie_detail():
    try:
        title = request.args.get('title')
        m_data = df[df['title'] == title]
        if m_data.empty: 
            return jsonify({"error": "not found"}), 404
        
        # 将这一行转为字典，并处理所有的 NaN 值
        row = m_data.fillna("Unknown").iloc[0].to_dict()
        
        emo_cols = [c for c in df.columns if c.startswith('f1_')]
        all_emotions = [{"name": c.replace('f1_', '').upper(), "value": float(row.get(c, 0))} for c in emo_cols]
        all_emotions.sort(key=lambda x: x['value'], reverse=True)
        
        top_8 = all_emotions[:8]
        max_v = max([x['value'] for x in top_8]) if top_8 else 1
        for x in top_8: 
            x['norm_value'] = round((x['value'] / max_v * 100), 2)
        
        return jsonify({
            "title": str(row['title']), 
            "year": int(row['year']) if row['year'] != "Unknown" else 0, 
            "rating": float(row['avg_rating']) if row['avg_rating'] != "Unknown" else 0,
            "overview": str(row['overview']), 
            "tagline": str(row['tagline']),
            "poster": f"https://image.tmdb.org/t/p/w500{row['poster_path']}" if row['poster_path'] != "Unknown" else "",
            "top_emotions": top_8,
            "main_color": row.get('main_color', '#c0392b')
        })
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

# --- 3. [新模块] 情绪宇宙 (Cosmos) 接口 ---
# --- app.py 中的修改 ---
@app.route('/api/stats/cosmos')
def get_cosmos():
    # 筛选高评分电影，确保数据质量
    f_df = df[df['avg_rating'] > 50].copy() 
    
    res = []
    for _, row in f_df.iterrows():
        # 寻找主导情绪
        emo_cols = [c for c in df.columns if c.startswith('f1_')]
        dom_emo = row[emo_cols].idxmax().replace('f1_', '').upper() if emo_cols else "UNKNOWN"

        res.append({
            "name": str(row['title']),
            "rating": float(row['avg_rating']),
            "year": int(row['year']),        # 关键：新增年份
            "genres": str(row['genres']),    # 关键：新增类型
            "color": str(row.get('main_color', '#c0392b')),
            "main_emotion": dom_emo
        })
    return jsonify(res)

# 相似度推荐引擎
@app.route('/api/similar_movies')
def get_similar_movies():
    title = request.args.get('title')
    m_data = df[df['title'] == title]
    if m_data.empty: return jsonify([])
    c_row = m_data.iloc[0]
    
    emo_cols = [c for c in df.columns if c.startswith('f1_')]
    v1 = [float(c_row[c]) for c in emo_cols]
    
    pool = df[(df['title'] != title) & (df['avg_rating'] > 60)].copy()
    res = []
    for _, row in pool.iterrows():
        v2 = [float(row[c]) for c in emo_cols]
        dist = math.sqrt(sum([(a - b) ** 2 for a, b in zip(v1, v2)]))
        res.append({
            "title": row['title'], 
            "poster": f"https://image.tmdb.org/t/p/w200{row['poster_path']}" if str(row['poster_path']) != "Unknown" else "", 
            "dist": dist
        })
    res.sort(key=lambda x: x['dist'])
    return jsonify(res[:3])

# 画廊 API
@app.route('/api/gallery')
def get_gallery():
    rooms = {"JOY": joy_col, "SADNESS": sad_col, "FEAR": fear_col, "SURPRISE": surp_col, "ANGER": angr_col}
    res = {}
    for r_name, col in rooms.items():
        if col:
            top = df.sort_values(by=col, ascending=False).head(20)
            res[r_name] = top[['title', 'poster_path', 'imdb_id']].to_dict(orient='records')
    return jsonify(res)

# 全球统计 API (平行坐标图)
@app.route('/api/stats/global')
def get_global_stats():
    top_df = df.sort_values(by='avg_rating', ascending=False).head(400)
    data_list = []
    targets = {"JOY": joy_col, "SAD": sad_col, "FEAR": fear_col, "SURP": surp_col, "ANGR": angr_col}
    c_max = {label: df[col].max() for label, col in targets.items() if col}
    
    for _, row in top_df.iterrows():
        item = {"title": str(row['title']), "rating": float(row['avg_rating']), "poster": str(row['poster_path'])}
        for label, col in targets.items():
            if col: 
                item[label] = round((float(row[col]) / c_max[label] * 100), 2) if c_max[label] > 0 else 0
            else: 
                item[label] = 0
        data_list.append(item)
    return jsonify(data_list)

# 馆长的仪式 (推荐逻辑)
@app.route('/api/recommend', methods=['POST'])
def recommend_movie():
    user_pref = request.json
    mapping = {"joy": joy_col, "sadness": sad_col, "fear": fear_col, "surprise": surp_col, "anger": angr_col}
    
    # 排除没有对应列的情况
    active_mapping = {k: v for k, v in mapping.items() if v is not None}
    max_vals = {key: df[col].max() for key, col in active_mapping.items()}
    
    scores = []
    pool = df[df['avg_rating'].astype(float) > 65]
    for _, row in pool.iterrows():
        dist = sum([(float(row[active_mapping[k]])/max_vals[k] - user_pref.get(k, 0.5))**2 for k in max_vals])
        scores.append({"title": row['title'], "dist": dist})
    
    scores.sort(key=lambda x: x['dist'])
    chosen = random.choice(scores[:15])
    return jsonify({"title": str(chosen['title']), "reason": "这部电影的频率在星图中与你交织。"})

if __name__ == '__main__':
    # 使用 use_reloader=False 防止在一些环境下双重加载数据
    app.run(debug=True, port=5000, use_reloader=False)