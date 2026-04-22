const lead = {

  source: row["Lead Source"] || "",

  name: row["Name"] || "",

  phone: row["Phone"] || "",

  email: row["Email"] || "",

  assigned_to:
    row["assigned_to"]
      ?.toLowerCase()
      .trim() || ""

};