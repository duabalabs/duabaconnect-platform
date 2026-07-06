'use client';

// DuabaConnect brand mark (from the landing app). Single wordmark asset, so it
// scales to fit the 60x60 sidebar slot via object-contain.
export const Logo = () => {
  return (
    <img
      src="/duabaconnect-logo.png"
      alt="DuabaConnect"
      width={60}
      height={60}
      className="mt-[8px] min-w-[60px] min-h-[60px] w-[60px] h-[60px] object-contain"
    />
  );
};
