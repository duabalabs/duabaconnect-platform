import React from 'react';

// DuabaConnect wordmark (from the landing app), replacing the Postiz wordmark.
export const LogoTextComponent = () => {
  return (
    <img
      src="/duabaconnect-logo.png"
      alt="DuabaConnect"
      height={33}
      className="h-[33px] w-auto object-contain"
    />
  );
};
