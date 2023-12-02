const express = require("express");
const app = express();

app.use(express.json());

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS, PUT, PATCH, DELETE, HEAD"
    );
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});

const { Client } = require("pg");

const client = new Client({
    user: "postgres",
    password: "KFpbY46yBik3U7Mq",
    database: "postgres",
    port: 5432,
    host: "db.amxwrxbngptrgtasmbms.supabase.co",
    ssl: { rejectUnauthorized: false },
});

client.connect();

const port = process.env.PORT || 2410;
app.listen(port, () => console.log(`Node app Listening on port ${port}!`));

app.get("/resetData1", async function (req, res) {
    try {
        await client.query("TRUNCATE TABLE shops RESTART IDENTITY");
        res.send("Data in shops table is reset");
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get("/resetData2", async function (req, res) {
    try {
        await client.query("TRUNCATE TABLE products RESTART IDENTITY");
        res.send("Data in products table is reset");
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get("/resetData3", async function (req, res) {
    try {
        await client.query("TRUNCATE TABLE purchases RESTART IDENTITY");
        res.send("Data in purchases table is reset");
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get("/shops", async function (req, res) {
    try {
        const result = await client.query("SELECT * FROM shops");
        const formattedShops = result.rows.map(row => ({
            shopId: row.shopid,
            shopName: row.shopname,
            rent: row.rent,
        }));

        res.send(formattedShops);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.post("/shops", async function (req, res) {
    try {
        const { shopname, rent } = req.body;

        if (!shopname) {
            return res.status(400).send("Shop name is required");
        }

        const result = await client.query(
            "INSERT INTO shops (shopname, rent) VALUES ($1, $2) RETURNING *",
            [shopname, rent]
        );

        res.send({shopId: result.rows[0].shopid,
            shopName: result.rows[0].shopname,
            rent: result.rows[0].rent});
        
    } catch (error) {
        res.status(500).send(error.message);
    }
});


app.get("/products", async function (req, res) {
    try {
        const result = await client.query("SELECT * FROM products");
        
        const formattedProducts = result.rows.map(row => ({
            productId: row.productid,
            productName: row.productname,
            category: row.category,
            description: row.description,
        }));

        res.send(formattedProducts);
    } catch (error) {
        res.status(500).send(error.message);
    }
});


app.post("/products", async function (req, res) {
    try {
        const { productName, category, description } = req.body;

        if (!productName) {
            return res.status(400).send("Product name is required");
        }

        const result = await client.query(
            "INSERT INTO products (productName, category, description) VALUES ($1, $2, $3) RETURNING *",
            [productName, category, description]
        );

        res.send({productId: result.rows[0].productid,
            productName: result.rows[0].productname,
            category: result.rows[0].category,
            description:result.rows[0].description});
    } catch (error) {
        res.status(500).send(error.message);
    }
});


app.get("/purchases", async function (req, res) {
    try {
        const { shop, product, sort } = req.query;

        let query = "SELECT * FROM purchases";

        if (shop || product) {
            query += " WHERE";
            if (shop) query += ` shopId IN (${shop})`;
            if (shop && product) query += " AND";
            if (product) query += ` productId = ${product}`;
        }

        if (sort) {
            query += " ORDER BY";
            if (sort === "QtyAsc") query += " quantity ASC";
            else if (sort === "QtyDesc") query += " quantity DESC";
            else if (sort === "ValueAsc") query += " quantity * price ASC";
            else if (sort === "ValueDesc") query += " quantity * price DESC";
        }

        const result = await client.query(query);
        const formattedPurchase = result.rows.map(row => ({
            purchaseId: row.purchaseid,
            shopId: row.shopid,
            productId: row.productid,
            quantity: row.quantity,
            price: row.price
        }));

        res.send(formattedPurchase);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.post("/purchases", async function (req, res) {
    try {
        const { shopId, productId, quantity, price } = req.body;
        const result = await client.query(
            "INSERT INTO purchases (shopId, productId, quantity, price) VALUES ($1, $2, $3, $4) RETURNING *",
            [shopId, productId, quantity, price]
        );
        res.send({purchaseId : result.rows[0].purchaseid,
            shopId: result.rows[0].shopid,
            productId: result.rows[0].productid,
            quantity: result.rows[0].quantity,
            price: result.rows[0].price});
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get("/totalPurchase/shop/:id", async function (req, res) {
    const shopId = +req.params.id;

    try {
        const result = await client.query(
            "SELECT productId, SUM(quantity) as totalQuantity FROM purchases WHERE shopId = $1 GROUP BY productId",
            [shopId]
        );

        const totalPurchase = result.rows.reduce((acc, row) => {
            acc[row.productid] = parseInt(row.totalquantity, 10);
            return acc;
        }, {});

        res.json(totalPurchase);
    } catch (error) {
        console.error("Error in /totalPurchase/shop/:id endpoint:", error);
        res.status(500).send(error.message);
    }
});



app.get("/totalPurchase/product/:id", async function (req, res) {
    try {
        const productId = +req.params.id;

        const result = await client.query(
            "SELECT shopId, SUM(quantity) as totalQuantity FROM purchases WHERE productId = $1 GROUP BY shopId",
            [productId]
        );

        const totalPurchase = result.rows.reduce((acc, row) => {
            acc[row.shopid] = parseInt(row.totalquantity, 10);
            return acc;
        }, {});

        res.json(totalPurchase);
    } catch (error) {
        res.status(500).send(error.message);
    }
});


app.get("/purchases/shops/:id", async function (req, res) {
    try {
        const id = +req.params.id;

        const result = await client.query("SELECT * FROM purchases WHERE shopId = $1", [id]);
        const formattedPurchase = result.rows.map(row => ({
            purchaseId: row.purchaseid,
            shopId: row.shopid,
            productId: row.productid,
            quantity: row.quantity,
            price: row.price
        }));
        res.send(formattedPurchase);
    } catch (error) {
        res.status(500).send(error.message);
    }
});


app.get("/products/:id", async function (req, res) {
    try {
        const id = +req.params.id;

        const result = await client.query("SELECT * FROM products WHERE productId = $1", [id]);

        if (result.rows.length > 0) {
            res.send({
                productId: result.rows[0].productid,
                productName: result.rows[0].productname,
                category: result.rows[0].category,
                description:result.rows[0].description
            });
        } else {
            res.status(404).send("No Product found");
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
});


app.get("/purchases/products/:id", async function (req, res) {
    try {
        const id = +req.params.id;

        const result = await client.query("SELECT * FROM purchases WHERE productId = $1", [id]);
        const formattedPurchase = result.rows.map(row => ({
            purchaseId: row.purchaseid,
            shopId: row.shopid,
            productId: row.productid,
            quantity: row.quantity,
            price: row.price
        }));
        if (formattedPurchase.length > 0) {
            res.send(formattedPurchase);
        } else {
            res.status(404).send("No Purchase found");
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
});




app.put("/products/:id", async function (req, res) {
    try {
        const body = req.body;
        const productId = +req.params.id;

        if (!body.productName) {

            return res.status(400).send("Product name is required");
        }
        const result = await client.query(
            "UPDATE products SET productName = $1, category = $2, description = $3 WHERE productId = $4 RETURNING *",
            [body.productName, body.category, body.description, productId]
        );
        if (result.rows.length > 0) {
            res.send({productId: result.rows[0].productid,
                productName: result.rows[0].productname,
                category: result.rows[0].category,
                description:result.rows[0].description});
        } else {
            res.status(404).send("No Product Found");
        }
    } catch (error) {
        res.status(500).send({success:error.message,message:"Hello"});
    }
});


process.on("SIGINT", () => {
    client.end();
    process.exit();
});
