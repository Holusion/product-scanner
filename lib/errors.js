'use strict';

export class BrowseError extends Error{
  constructor(code, message){
    super(message);
    this.code = code;
  }
}

