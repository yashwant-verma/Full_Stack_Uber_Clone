import { UserDataContext } from "./contexts";
import PropTypes from "prop-types";
import { useState } from "react";

const UserContext = ({ children }) => {
  const [user, setUser] = useState({
    email: "",
    fullName: {
      firstName: "",
      lastName: "",
    },
  });

  return (
    <div>
      <UserDataContext.Provider value={{ user, setUser }}>
        {children}
      </UserDataContext.Provider>
    </div>
  );
};

export default UserContext;
UserContext.propTypes = { children: PropTypes.node };
