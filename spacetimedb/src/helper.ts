// 

import { schema, table, t, SenderError  } from 'spacetimedb/server';


export function validateMessage(text: string) {
  if (!text) {
    throw new SenderError('Messages must not be empty');
  }
}

export function validateName(name: string) {
  if (!name) {
    throw new SenderError('Names must not be empty');
  }
}