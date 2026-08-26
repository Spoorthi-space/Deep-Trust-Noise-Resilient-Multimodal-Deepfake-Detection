migrate((app) => {
  try {
    const collection = app.findCollectionByNameOrId("users");
    
    // Check if role field already exists
    const roleField = collection.fields.get("role");
    if (!roleField) {
      collection.fields.add(new TextField({
        name: "role",
        required: false
      }));
      return app.save(collection);
    }
  } catch (e) {
    console.log("Error in update_users migration: " + e);
  }
  return null;
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("users");
    collection.fields.remove("role");
    return app.save(collection);
  } catch (e) {
    return null;
  }
});
