# 音效生成指南

## 快速开始

### 1. 使用 sfxr.me 生成音效

访问 [sfxr.me](https://sfxr.me/) 在线生成音效。

### 2. 音效文件清单

将生成的音效文件保存到 `audio/` 文件夹，使用以下命名：

#### 战斗核心
- `shoot_normal.mp3` - 普通射击（游侠）
- `shoot_fire.mp3` - 火元素射击
- `shoot_ice.mp3` - 冰元素射击
- `shoot_lightning.mp3` - 雷元素射击

#### 击中与爆炸
- `hit_flesh.mp3` - 击中敌人
- `hit_metal.mp3` - 击中障碍物
- `explosion_small.mp3` - 小爆炸
- `explosion_large.mp3` - 大爆炸
- `explosion.mp3` - 通用爆炸（向后兼容）

#### 元素反应
- `reaction_freeze.mp3` - 冻结反应
- `reaction_vaporize.mp3` - 蒸发反应

#### 拾取与成长
- `pickup_coin.mp3` - 获得金币
- `pickup_exp.mp3` - 获得经验（频繁触发，需柔和）
- `levelup.mp3` - 升级
- `chest_open.mp3` - 打开宝箱
- `relic_get.mp3` - 获得遗物

#### UI 与系统
- `ui_click.mp3` - 按钮点击
- `ui_error.mp3` - 错误提示
- `warning.mp3` - 警告/Boss来袭
- `victory.mp3` - 胜利
- `game_over.mp3` - 失败

#### 背景音乐
- `bgm.mp3` - 背景音乐（循环播放）

### 3. sfxr.me 参数调优指南

#### 射击声 (`shoot_*.mp3`)
1. 点击 **"Laser/Shoot"** 按钮
2. 多次点击直到找到满意的声音
3. **火元素**：增加 `Slide`（滑音），降低 `Start Frequency`
4. **雷元素**：增加 `Duty Cycle`，制造方波感
5. **冰元素**：提高 `Start Frequency`，增加清脆感

#### 爆炸声 (`explosion_*.mp3`)
1. 点击 **"Explosion"** 按钮
2. **小爆炸**：缩短 `Decay Time`
3. **大爆炸**：拉长 `Sustain Time`，增加 `Low Pass Filter`

#### 拾取物品 (`pickup_*.mp3`)
1. 点击 **"Pickup/Coin"** 按钮
2. **经验球**：将 `Sustain Time` 调到极短，做成 "Bloop" 声
3. **金币**：保持经典的 "Ding" 或 "Chime" 声

#### 升级音效 (`levelup.mp3`)
1. 点击 **"Powerup"** 按钮
2. 调整成上升音调，有满足感

#### 击中音效 (`hit_*.mp3`)
1. 点击 **"Hit/Hurt"** 按钮
2. 选择闷一点的、低频的声音

### 4. 文件格式转换

1. 从 sfxr.me 下载 `.wav` 文件
2. 使用在线工具转换为 `.mp3`（推荐 [CloudConvert](https://cloudconvert.com/)）
3. 建议压缩率：128kbps（平衡质量和体积）

### 5. 备用资源

如果不想自己生成，可以使用以下免费资源：

- **Kenney Assets**: https://kenney.nl/assets/category:audio
  - 推荐下载 "RPG Audio", "Sci-Fi Sounds", "Interface Sounds"
- **Freesound.org**: https://freesound.org/
  - 搜索："magic spell", "gunshot", "coin collect", "8bit explosion"

## 音效系统特性

### 音高随机化 (Pitch Randomization)

系统已自动为频繁触发的音效启用音高随机化：
- ✅ 射击音效（`varyPitch = true`）
- ✅ 经验球拾取（`varyPitch = true`）
- ✅ 金币拾取（`varyPitch = true`）
- ✅ 击中音效（`varyPitch = true`）

重要音效保持原调：
- ❌ 升级音效（`varyPitch = false`）
- ❌ 获得遗物（`varyPitch = false`）
- ❌ Boss 警告（`varyPitch = false`）

### 元素音效

不同元素使用不同的射击音效：
- 🔥 火元素 → `shoot_fire.mp3`
- ❄️ 冰元素 → `shoot_ice.mp3`
- ⚡ 雷元素 → `shoot_lightning.mp3`
- 💧 水元素 → `shoot_water.mp3`（默认使用普通音效）
- 🎯 无元素 → `shoot_normal.mp3`

## 注意事项

1. **文件缺失处理**：如果某个音效文件不存在，系统会自动使用默认音效
2. **性能优化**：频繁音效（如射击）已启用音高随机化，避免听觉疲劳
3. **音量平衡**：BGM 音量设置为 0.6，音效为 1.0，确保音效清晰可听

