// server api

import spacetimedb, { init, onConnect, onDisconnect, update_simulation_tick_collision3d } from "./module";

import { 
  set_name
} from './reducers/reducer_user';

import { 
  send_message 
} from './reducers/reducer_message'

import { 
  create_player,
  delete_player,
  create_player_transform3d,
  set_player_position,
  create_entity,
  delete_entity,
  create_entity_transform3d,
  set_transform3d_position,
  remove_transform3d,
  create_entity_box,
  create_entity_sphere,
  remove_entity_body3d,
  create_entity_box_test,
} from './reducers/reducer_entity';

import { 
  game_start_tick,
  game_stop_tick,
  game_set_tick_rate,
  game_current_tick,
} from './reducers/reducer_simulation';

import { 
  update_input
} from './reducers/reducer_input';

import { my_player } from './views/view_entity'

// note reducers need to export here.
export {
  // spacetimedb set up
  init,
  onConnect,
  onDisconnect,
  //
  set_name,
  //
  send_message,
  //
  update_input,
  //
  update_simulation_tick_collision3d,
  //
  game_start_tick,
  game_stop_tick,
  game_set_tick_rate,
  game_current_tick,
  //
  create_player,
  delete_player,
  create_player_transform3d,
  create_entity_transform3d,
  set_player_position,
  create_entity,
  delete_entity,
  set_transform3d_position,
  remove_transform3d,
  create_entity_box,
  create_entity_sphere,
  remove_entity_body3d,
  create_entity_box_test,
  // view
  my_player,
}
// export
export default spacetimedb;

