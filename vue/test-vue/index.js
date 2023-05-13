new Vue({
  created: function() {
    console.log("created");
  },
  mounted: function() {
    window.addEventListener("popstate", this.changeState, false);
    setInterval(this.update_message(100), 500);

    const btn = document.querySelector("#new_btn");

    btn.addEventListener("click", () => {
      console.log("new clicl btn");
      this.update_message(100);
    });

    console.log("mounted");
  },
  methods: {
    update_message: function(item) {
      this.message += item;
    },
  },
  data: {
    message: 100,
  },
}).$mount("#app");
