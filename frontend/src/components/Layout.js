import Navbar from "./Navbar";
import Footer from "./Footer";

import React from "react";

const Layout = ({ children }) => {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
};

export default Layout;
