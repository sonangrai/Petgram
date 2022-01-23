import Auth from "../model/Auth.model";
import ResponseObj from "./Response";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { validationResult } from "express-validator";

/**
 * This task is for registering a new user
 * @returns
 */
export const RegisterTask = async (req, res) => {
  let { email, username, password } = req.body;
  //Checking validations
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    let respObject = new ResponseObj(
      400,
      errors.errors,
      "Validations error occured"
    );
    return res.status(400).send(respObject);
  }

  /**
   * Checking if the email is already existing
   */
  let found = await Auth.findOne({ email });
  if (found) {
    let resData = new ResponseObj(409, {}, "Email already Taken");
    return res.send(resData);
  }

  /**
   * Creating the new user object with the body request
   */
  let newUser = new Auth();
  newUser.email = email;
  newUser.username = username;

  /**
   * Generating salt
   */
  let salt = await bcrypt.genSalt(10);
  //Hashing the password
  newUser.password = await bcrypt.hash(password, salt);

  /**
   * Generating token for the activation link
   */
  let token = jwt.sign({ expiresIn: 360000 }, process.env.mySecret);

  /**
   * Saving to database
   */
  try {
    await newUser.save();
    let resData = new ResponseObj(200, newUser, "Confirm link is sent to mail");
    //SendActivationMail(newUser._id, token, newUser.email);
    return res.send(resData);
  } catch (error) {
    let resData = new ResponseObj(400, error, "User save failed");
    return res.send(resData);
  }
};

/**
 * Create activate token and save to mongodb
 */
export const SendActivationMail = async (id, token, email) => {
  console.log(email, token, id);

  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    auth: {
      user: "shonahangrae@gmail.com",
      pass: process.env.myPass,
    },
  });

  let info = await transporter.sendMail({
    from: '"Fred Foo 👻" <foo@example.com>', // sender address
    to: email, // list of receivers
    subject: "Password Reset Request", // Subject line
    text: "Forgot Your Password", // plain text body
    html: `<p>CLick here to change your password <a href="/api/resetpassword/${id}/${token}">Reset password</a> </p>`, // html body
  });
  console.log("Message sent: %s", info.messageId);
};

/**
 * The login task
 */
export const LoginTask = async (req, res) => {
  const { logtype, password } = req.body;
  //Checking validations
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    let respObject = new ResponseObj(
      400,
      errors.errors,
      "Validations error occured"
    );
    return res.status(400).send(respObject);
  }

  /**
   * Finding the user
   */
  try {
    let findUser =
      (await Auth.findOne({ username: logtype })) ||
      (await Auth.findOne({ email: logtype }));
    if (!findUser) {
      let responseObj = new ResponseObj(401, {}, "User not found");
      return res.status(401).send(responseObj);
    }

    //Checking if the account is activated
    if (findUser.status != 1) {
      let responsObj = new ResponseObj(
        405,
        findUser,
        "Your account is not activated"
      );
      return res.status(405).send(responsObj);
    }

    //Finally checking the password
    const isMatch = await bcrypt.compare(password, findUser.password);
    if (!isMatch) {
      let responsObj = new ResponseObj(401, {}, "Password did not matched");
      res.status(401).send(responsObj);
    }

    let access_token = jwt.sign(
      { user: { id: findUser._id } },
      process.env.mySecret,
      { expiresIn: 360000 }
    );

    let resData = {
      access_token: access_token,
      user: findUser,
    };

    let respObject = new ResponseObj(400, resData, "Login Successfull");
    return res.status(400).send(respObject);
  } catch (error) {
    let responseObj = new ResponseObj(500, error, "Server Error");
    return res.status(500).send(responseObj);
  }
};