// --- START OF FILE js/core/formation.js ---
import Enemy from '../npc/enemy.js';

export default class FormationManager {
  static spawnCircle(game, x, y, count, radius) {
    const angleStep = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      const ex = x + Math.cos(angle) * radius;
      const ey = y + Math.sin(angle) * radius;
      
      // 确保在地图内
      if (ex > 0 && ex < game.worldWidth && ey > 0 && ey < game.worldHeight) {
         game.enemies.push(new Enemy(game.worldWidth, game.worldHeight, 'normal', 1, game));
         // 强制覆盖位置
         const e = game.enemies[game.enemies.length - 1];
         e.x = ex; 
         e.y = ey;
      }
    }
  }
  
  static spawnHorde(game, camera) {
    // 在摄像机边缘生成一圈怪
    const cx = camera.x + game.screenWidth / 2;
    const cy = camera.y + game.screenHeight / 2;
    this.spawnCircle(game, cx, cy, 20, 500); // 半径500的包围圈
  }
}

