import React, { Component } from "react";
import { MDBContainer } from "mdbreact";
import "mdbreact/dist/css/mdb.css";
import ErrorText from "../../components/ErrorText/ErrorText";
import LoadingWheel from "../../components/LoadingWheel/LoadingWheel";

export default class LoginWithSchoolStep2 extends Component {
  constructor(props) {
    super(props);

    // Process args
    if(this.props.location.search) {
      console.log("Getting things");

      var result = new URLSearchParams(this.props.location.search).get("result");
      var data = JSON.parse(new URLSearchParams(this.props.location.search).get("data"));
      var error = JSON.parse(new URLSearchParams(this.props.location.search).get("error"));

    }

    // Set up the state
    this.state = {
      result: result,
      firstName: data.firstName,
      lastName: data.lastName,
      userName: data.userName,
      error: error,
      doneLoading: false,
    };
  }

  stopLoading = () => {
    this.setState({
      doneLoading: true
    });
  };

  componentDidMount() {
    this.props.updateTitle("Login With School Step 2");
  }

  render() {
    if (this.state.result === "failure") {
      alert("Error: " + this.state.error + " Please try again.");
      if(this.state.error === "User is not registered"){
        console.log("Error: " + this.state.error);
        // Redirect to register page
        this.props.history.push("/register/school");
      } else if(this.state.error === "User has not logged in with RPI."){
        console.log("Error: " + this.state.error);
        // Redirect to login page
        this.props.history.push("/login/school");
      } else { //database error - show the ErrorText component
        return ( //for some reason, this only shows up after clicking submit twice
          <ErrorText text={this.state.error}> </ErrorText>
        );
      }
    } else if (!this.state.doneLoading) {
      return (
        <MDBContainer className="page">
          <LoadingWheel/>
          <button className="button" onClick={this.stopLoading}>End Loading</button>
        </MDBContainer>
      );
    } else {
      // Save data about the user
      localStorage.setItem("loggedIn", true);
      localStorage.setItem("firstName", this.state.firstName);
      localStorage.setItem("lastName", this.state.lastName);
      localStorage.setItem("userName", this.state.userName);

      console.log("everything worked; redirecting to /groups");
      this.props.history.push("/groups");

      //technically we'll never get here, but this makes react happy
      return (
        <p>Logging in...</p>
      );
    }
  }
}
