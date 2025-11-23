// --- START OF FILE js/ui/compendium.js ---
import { ItemRegistry, Rarity } from '../data/items.js';

export default class Compendium {
  constructor(screenWidth, screenHeight, onClose) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.onClose = onClose;
    this.unlockedItems = wx.getStorageSync('unlocked_items') || [];
    
    // 分页
    this.page = 0;
    this.itemsPerPage = 20; // 4行5列
    this.itemList = Object.values(ItemRegistry);
    this.totalPages = Math.ceil(this.itemList.length / this.itemsPerPage);
    this.selectedItem = null; // 选中的道具，显示详情
  }

  handleTouch(x, y) {
    // 关闭按钮
    if (x > this.screenWidth - 60 && y < 60) {
      this.onClose();
      return;
    }
    
    // 翻页按钮
    if (y > this.screenHeight - 60) {
      if (x < this.screenWidth / 2) {
        // 上一页
        if (this.page > 0) this.page--;
      } else {
        // 下一页
        if (this.page < this.totalPages - 1) this.page++;
      }
      return;
    }
    
    // 检查是否点击了道具
    const startX = 50;
    const startY = 100;
    const size = 60;
    const gap = 20;
    const cols = 5;
    const startIdx = this.page * this.itemsPerPage;
    const endIdx = Math.min(startIdx + this.itemsPerPage, this.itemList.length);

    for (let i = startIdx; i < endIdx; i++) {
      const item = this.itemList[i];
      const gridIndex = i - startIdx;
      const r = Math.floor(gridIndex / cols);
      const c = gridIndex % cols;
      
      const itemX = startX + c * (size + gap);
      const itemY = startY + r * (size + gap);
      
      if (x >= itemX && x <= itemX + size && y >= itemY && y <= itemY + size) {
        this.selectedItem = item;
        return;
      }
    }
    
    // 点击空白处取消选择
    this.selectedItem = null;
  }

  render(ctx) {
    // 背景
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 标题
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    const progress = Math.floor((this.unlockedItems.length / this.itemList.length) * 100);
    ctx.fillText(`Artifact Compendium (${progress}%)`, this.screenWidth / 2, 50);
    
    // 关闭按钮 X
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('X', this.screenWidth - 30, 40);

    // 绘制网格
    const startX = 50;
    const startY = 100;
    const size = 60;
    const gap = 20;
    const cols = 5;

    const startIdx = this.page * this.itemsPerPage;
    const endIdx = Math.min(startIdx + this.itemsPerPage, this.itemList.length);

    for (let i = startIdx; i < endIdx; i++) {
      const item = this.itemList[i];
      const isUnlocked = this.unlockedItems.includes(item.id);
      const gridIndex = i - startIdx;
      const r = Math.floor(gridIndex / cols);
      const c = gridIndex % cols;
      
      const x = startX + c * (size + gap);
      const y = startY + r * (size + gap);

      // 绘制框
      ctx.fillStyle = isUnlocked ? this.getRarityColor(item.rarity) : '#333';
      ctx.fillRect(x, y, size, size);
      
      // 边框
      ctx.strokeStyle = this.selectedItem && this.selectedItem.id === item.id ? '#f1c40f' : '#555';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, size, size);
      
      // 绘制图标/名字
      if (isUnlocked) {
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // 名字换行显示
        const name = item.name.length > 4 ? item.name.substring(0, 4) : item.name;
        ctx.fillText(name, x + size/2, y + size/2 - 5);
        // 稀有度标识
        ctx.font = '8px Arial';
        ctx.fillStyle = this.getRarityColor(item.rarity);
        ctx.fillText(this.getRarityText(item.rarity), x + size/2, y + size/2 + 8);
      } else {
        ctx.fillStyle = '#555';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x + size/2, y + size/2);
      }
    }
    
    // 绘制详情面板
    if (this.selectedItem && this.unlockedItems.includes(this.selectedItem.id)) {
      this.renderItemDetail(ctx, this.selectedItem);
    }
    
    // 翻页提示
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Page ${this.page + 1}/${this.totalPages}`, this.screenWidth / 2, this.screenHeight - 30);
    if (this.page > 0) {
      ctx.fillText('< Prev', this.screenWidth / 4, this.screenHeight - 30);
    }
    if (this.page < this.totalPages - 1) {
      ctx.fillText('Next >', this.screenWidth * 3 / 4, this.screenHeight - 30);
    }
  }
  
  renderItemDetail(ctx, item) {
    const panelX = this.screenWidth - 250;
    const panelY = 100;
    const panelW = 200;
    const panelH = 300;
    
    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    
    // 边框
    ctx.strokeStyle = this.getRarityColor(item.rarity);
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    
    // 名字
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(item.name, panelX + panelW / 2, panelY + 30);
    
    // 稀有度
    ctx.fillStyle = this.getRarityColor(item.rarity);
    ctx.font = '14px Arial';
    ctx.fillText(this.getRarityText(item.rarity), panelX + panelW / 2, panelY + 55);
    
    // 描述
    ctx.fillStyle = '#bdc3c7';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    const descLines = this.wrapText(ctx, item.desc, panelW - 20);
    descLines.forEach((line, i) => {
      ctx.fillText(line, panelX + 10, panelY + 85 + i * 18);
    });
    
    // 类型
    ctx.fillStyle = '#95a5a6';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Type: ${item.type}`, panelX + 10, panelY + panelH - 20);
  }
  
  wrapText(ctx, text, maxWidth) {
    const words = text.split('');
    const lines = [];
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }
  
  getRarityColor(rarity) {
    switch(rarity) {
      case Rarity.COMMON: return '#bdc3c7';
      case Rarity.UNCOMMON: return '#2ecc71';
      case Rarity.RARE: return '#3498db';
      case Rarity.EPIC: return '#9b59b6';
      case Rarity.LEGENDARY: return '#f1c40f';
      case Rarity.CURSED: return '#e74c3c';
      default: return '#fff';
    }
  }
  
  getRarityText(rarity) {
    switch(rarity) {
      case Rarity.COMMON: return 'Common';
      case Rarity.UNCOMMON: return 'Uncommon';
      case Rarity.RARE: return 'Rare';
      case Rarity.EPIC: return 'Epic';
      case Rarity.LEGENDARY: return 'Legendary';
      case Rarity.CURSED: return 'Cursed';
      default: return '';
    }
  }
}

