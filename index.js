import express from "express";
import pg from "pg";
import env from "dotenv";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import striptags from "striptags";

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;

env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

db.connect();

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());
app.use(passport.session());

async function retrieveBlog(id) {
  const result = (
    await db.query(
      "SELECT b.id, b.status, b.blogname, b.blogcontent, b.published_at, b.category, u.firstname, u.lastname, u.email, u.about FROM blogs b LEFT JOIN users u ON b.blogauthor_id = u.id WHERE b.id=$1",
      [id]
    )
  ).rows;
  return result;
}

app.get("/", async (req, res) => {
  if (req.isAuthenticated() && req.user.type == "admin") {
    res.redirect("/admin");
  } else {
    const order = req.query.order || `ASC`;
    var baseQuery = `SELECT b.id, b.blogname, b.status, b.blogcontent, b.published_at, b.category, u.firstname, u.lastname, u.email FROM blogs b LEFT JOIN users u ON b.blogauthor_id = u.id WHERE b.status='approved'`;
    const params = [];
    let paramIndex = 1;

    const searchQuery = req.query.search || "";
    const category = req.query.category || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    if (searchQuery) {
      baseQuery += ` AND (b.blogname ILIKE $${paramIndex} OR b.blogcontent ILIKE $${paramIndex})`;
      params.push(`%${searchQuery}%`);
      paramIndex++;
    }

    if (category) {
      baseQuery += ` AND b.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    const totalBlogs = (await db.query(baseQuery, params)).rowCount;

    baseQuery += ` ORDER BY b.blogname ${order}`;

    baseQuery += ` LIMIT $${paramIndex} OFFSET $${++paramIndex}`;
    params.push(limit, offset);

    var data = (await db.query(baseQuery, params)).rows;
    const totalPages = Math.ceil(totalBlogs / limit);
    data = data.map((blog) => ({
      ...blog,
      blogcontent:
        striptags(blog.blogcontent, [], " ").length > 300
          ? striptags(blog.blogcontent, [], " ").slice(0, 300) + "..."
          : striptags(blog.blogcontent, [], " "),
    }));

    console.log(req.user);
    var user = null;
    if (req.isAuthenticated()) {
      user = req.user;
    }
    if (data.length == 0) {
      data = null;
    }
    res.render("home.ejs", {
      blogs: data,
      user: user,
      currentPage: page,
      totalPages: totalPages,
      search: searchQuery,
      category: category,
      order: order,
    });
  }
});

app.get("/admin", async (req, res) => {
  console.log("=== ADMIN ROUTE HIT ===");
  console.log("req.user:", req.user);
  console.log("session:", req.session);
  if (req.isAuthenticated() && req.user.type == "admin") {
    const blogData = (
      await db.query(
        "SELECT b.id, b.blogname, b.blogcontent, b.published_at, b.category, u.firstname, u.lastname, u.email FROM blogs b LEFT JOIN users u ON b.blogauthor_id = u.id WHERE b.status=$1",
        ["approved"]
      )
    ).rows;
    const userData = (
      await db.query("SELECT * FROM users WHERE type=$1", ["user"])
    ).rows;
    const approveBlogData = (
      await db.query(
        "SELECT b.id, b.blogname, b.blogcontent, b.published_at, b.created_at, b.category, u.firstname, u.lastname, u.email FROM blogs b LEFT JOIN users u ON b.blogauthor_id = u.id WHERE b.status=$1",
        ["pending"]
      )
    ).rows;
    const blogCount = blogData.length;
    const userCount = userData.length;
    const approveBlogsCount = approveBlogData.length;
    res.render("adminPanel.ejs", {
      blogs: blogData,
      users: userData,
      blogCount: blogCount,
      userCount: userCount,
      approveBlogData: approveBlogData,
      approveBlogsCount: approveBlogsCount,
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/profile/:id", async (req, res) => {
  const id = req.params.id;
  var user = req.user;
  console.log(user);
  const blogs = (
    await db.query("SELECT * FROM blogs where blogauthor_id = $1", [id])
  ).rows;
  if (req.isAuthenticated()) {
    if (id == user.id) {
      res.render("userProfile.ejs", { user: user, logOut: true, blogs: blogs });
    } else {
      res.redirect("/login");
    }
  } else {
    res.redirect("/login");
  }
});

app.get("/create", (req, res) => {
  if (req.isAuthenticated()) {
    var user = req.user;
    res.render("createBlog.ejs", { user: user });
  } else {
    res.redirect("/");
  }
});

app.post("/update/:id", async (req, res) => {
  if (req.isAuthenticated()) {
    const updatedData = req.body;

    const id = req.params.id;
    if (id == req.user.id) {
      await db.query(
        "UPDATE users SET firstname = $1, lastname = $2, about = $3 WHERE id = $4 ",
        [updatedData.firstName, updatedData.lastName, updatedData.about, id]
      );
      res.redirect("/profile/" + id);
    } else {
      res.redirect("/");
    }
  } else {
    res.redirect("/");
  }
});

app.post("/create", async (req, res) => {
  if (req.isAuthenticated()) {
    const blogData = req.body;
    const status = "pending";
    await db.query(
      "INSERT INTO blogs(blogname,blogcontent,category,blogauthor_id,status) VALUES ($1, $2, $3, $4, $5)",
      [
        blogData.title,
        blogData.content,
        blogData.type,
        blogData.authorId,
        status,
      ]
    );
    res.redirect("/");
  } else {
    res.redirect("/");
  }
});

app.post("/approveblog/:id", async (req, res) => {
  const blogId = req.params.id;

  if (req.isAuthenticated() && req.user.type === "admin") {
    try {
      await db.query(
        "UPDATE blogs SET status = 'approved', published_at = NOW() WHERE id = $1",
        [blogId]
      );
      res.redirect("/admin");
    } catch (err) {
      console.error(err);
      res.redirect("/admin?error=FailedToApprove");
    }
  } else {
    res.redirect("/login");
  }
});

app.post("/rejectblog/:id", async (req, res) => {
  const blogId = req.params.id;

  if (req.isAuthenticated() && req.user.type === "admin") {
    try {
      await db.query("DELETE FROM blogs WHERE id = $1", [blogId]);
      res.redirect("/admin");
    } catch (err) {
      console.error(err);
      res.redirect("/admin?error=RejectFailed");
    }
  } else {
    res.redirect("/login");
  }
});

app.get("/blog/:id", async (req, res) => {
  const Blogid = req.params.id;
  var user = null;
  if (req.isAuthenticated()) {
    user = req.user;
  }
  const data = await retrieveBlog(Blogid);
  console.log(data);
  if (data[0].status == "pending") {
    if (req.isAuthenticated() && user.type == "admin") {
      res.render("blog.ejs", { blog: data[0], user: user });
    } else {
      res.redirect("/");
    }
  } else {
    res.render("blog.ejs", { blog: data[0], user: user });
  }
});

app.get("/deleteblog/:blogid", async (req, res) => {
  const blogId = req.params.blogid;
  console.log(blogId);
  if (req.isAuthenticated()) {
    const user = req.user.id;
    const result = (
      await db.query("SELECT blogauthor_id FROM blogs WHERE id=$1", [blogId])
    ).rows[0].blogauthor_id;
    console.log(result);
    if (user == result || req.user.type == "admin") {
      await db.query("DELETE FROM blogs WHERE id=$1", [blogId]);
      if (req.user.type == "admin") {
        res.redirect("/admin");
      } else {
        res.redirect(`/profile/${user}?message=Blog%20successfully%20deleted.`);
      }
    } else {
      res.redirect("/");
    }
  } else {
    res.redirect("/");
  }
});

app.get("/editblog/:blogId", async (req, res) => {
  const blogId = req.params.blogId;
  console.log(blogId);
  if (req.isAuthenticated()) {
    const user = req.user.id;
    const result = (
      await db.query("SELECT blogauthor_id FROM blogs WHERE id=$1", [blogId])
    ).rows[0].blogauthor_id;
    if (user == result) {
      const data = await retrieveBlog(blogId);
      res.render("editBlog.ejs", { blog: data[0], user: req.user });
    } else {
      res.redirect("/");
    }
  } else {
    res.redirect("/");
  }
});

app.post("/editblog/:blogId", async (req, res) => {
  const blogId = req.params.blogId;
  console.log(blogId);
  const blogData = req.body;
  if (req.isAuthenticated()) {
    const user = req.user.id;
    const result = (
      await db.query("SELECT blogauthor_id FROM blogs WHERE id=$1", [blogId])
    ).rows[0].blogauthor_id;
    if (user == result) {
      await db.query(
        "UPDATE blogs SET blogname =$1 ,blogcontent = $2,category = $3 WHERE id=$4",
        [blogData.title, blogData.content, blogData.type, blogId]
      );
      res.redirect(`/profile/${user}?message=Blog20updated%20successfully%.`);
    } else {
      res.redirect("/");
    }
  } else {
    res.redirect("/");
  }
});

app.get("/login", (req, res) => {
  res.render("login.ejs", { notContent: true });
});

app.get("/register", (req, res) => {
  res.render("register.ejs", { notContent: true });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login?error=Invalid%20credentials",
  })
);

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
      return res.redirect("/?error=LogoutFailed");
    }
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
});

app.get("/delete/:id", async (req, res) => {
  const id = req.params.id;
  const deletePlaceHolder = -1;
  if (req.isAuthenticated()) {
    if (id == req.user.id || req.user.type == "admin") {
      try {
        await db.query(
          "UPDATE blogs SET blogauthor_id = $1 WHERE blogauthor_id = $2",
          [deletePlaceHolder, id]
        );
        await db.query("DELETE FROM users WHERE id=$1", [id]);
        if (req.user.type == "admin") {
          res.redirect("/admin");
        } else {
          res.redirect("/logout");
        }
        res.redirect("/logout");
      } catch (err) {
        console.log(err);
      }
    } else {
      res.redirect("/");
    }
  } else {
    res.redirect("/");
  }
});

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;
  const fName = req.body.fName;
  const lName = req.body.lName;
  const type = "user";

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.redirect(
        "/login?error=User%20Already%20Exists.%20Consider%20logging%20in."
      );
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password, firstname, lastname, type) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [email, hash, fName, lName, type]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/bloggy",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb(null, false);
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        "https://blogproject-production-1644.up.railway.app/auth/google/bloggy",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log(profile);
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const type = "user";
          const newUser = await db.query(
            "INSERT INTO users (email, password, firstname, lastname, type) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [
              profile.email,
              "google",
              profile.given_name,
              profile.family_name,
              type,
            ]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);
passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return cb(null, false); //Tells Passport "user not found", safely
    }
    cb(null, result.rows[0]);
  } catch (err) {
    cb(err, null);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
