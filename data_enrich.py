import pandas as pd
import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import requests
from PIL import Image
from io import BytesIO

# 1. 加载数据
df = pd.read_csv('movie_master_data.csv')

# 2. 聚类降维 (为“星图”计算坐标)
# 提取所有情感列 (f1_开头的)
emo_cols = [c for c in df.columns if c.startswith('f1_')]
X = df[emo_cols].fillna(0)

# 标准化并使用 PCA 降维到 2D
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
pca = PCA(n_components=2)
coords = pca.fit_transform(X_scaled)

df['x'] = coords[:, 0]
df['y'] = coords[:, 1]

# 3. 颜色提取 (演示逻辑：由于1500部下载太慢，我们先根据主导情绪分配艺术色调)
# 实际作业建议提取海报色，这里先用情感映射保证 UI 效果
def map_color(row):
    # 自动获取当前电影得分最高的情感列名
    top_emo = row[emo_cols].idxmax()
    
    # 重新定义高饱和度、艺术感的色彩映射表
    # 重点：增加 amusement, love, excitement 等正向或中间情绪
    mapping = {
        'f1_happine': '#F1C40F', # 阳光黄 (Happiness/Joy)
        'f1_amuseme': '#FF69B4', # 亮粉色 (Amusement) - 让它跳出来！
        'f1_sadness': '#3498DB', # 忧郁蓝 (Sadness)
        'f1_fear':    '#8E44AD', # 迷幻紫 (Fear)
        'f1_anger':   '#E74C3C', # 愤怒红 (Anger)
        'f1_surpris': '#1ABC9C', # 青绿色 (Surprise)
        'f1_love':    '#FF4757', # 珊瑚色 (Love)
        'f1_exciten': '#F39C12', # 橘色 (Excitement)
        'f1_trust':   '#2ECC71', # 翠绿色 (Trust)
    }
    
    # 如果 top_emo 不在字典里，返回深灰色
    return mapping.get(top_emo, '#BDC3C7')

df['main_color'] = df.apply(map_color, axis=1)

# 4. 保存增强后的数据集
df.to_csv('movie_enriched_data.csv', index=False)
print("✅ 增强版数据集已生成：movie_enriched_data.csv")