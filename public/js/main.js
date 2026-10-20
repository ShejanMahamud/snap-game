/* Entry point: wire the layers together and start the game. */
import { init as init_view_audio } from './view/audio.js';
import { init as init_model_badges } from './model/badges.js';
import { init as init_view_ui_hub } from './view/ui/hub.js';
import { init as init_view_ui_gift } from './view/ui/gift.js';
import { init as init_view_ui_menu, promptForPlayerName } from './view/ui/menu.js';
import { init as init_view_ui_stages } from './view/ui/stages.js';
import { init as init_view_ui_result } from './view/ui/result.js';
import { init as init_view_ui_board } from './view/ui/board.js';
import { init as init_view_ui_shop } from './view/ui/shop.js';
import { init as init_view_ui_challenge } from './view/ui/challenge.js';
import { hideSplash } from './splash.js';
import { init as init_controller_input } from './controller/input.js';
import { initPwa } from './pwa.js';
import { boot } from './controller/loop.js';
import { initializeUser } from './model/store.js';
import { flushPending } from './model/leaderboard.js';

// Initialize user session and sync with server
(async function initApp() {
  init_view_audio();
  init_model_badges();
  init_view_ui_hub();
  init_view_ui_gift();
  init_view_ui_menu();
  init_view_ui_stages();
  init_view_ui_result();
  init_view_ui_board();
  init_view_ui_shop();
  init_controller_input();
  boot();
  init_view_ui_challenge();
  initPwa();
  
  // Initialize user and sync with server
  await initializeUser();
  
  // Flush any pending score submissions
  await flushPending();
  
  hideSplash();
  promptForPlayerName();
})();

