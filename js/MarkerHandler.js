var tableNumber = null;

AFRAME.registerComponent("marker-handler", {
  init: async function() {

    if (tableNumber === null) {
      this.askTableNumber();
    }

    var dishes = await this.getDishes();

    this.el.addEventListener("markerFound", () => {
      if(tableNumber !== null){
      var markerId = this.el.id;
        this.handleMarkerFound(dishes, markerId);
      }
    });

    this.el.addEventListener("markerLost", () => {
      this.handleMarkerLost();
    });
  },

  askTableNumber: function() {
    var iconUrl = "https://raw.githubusercontent.com/siddhantpallod/AR-Menu-Assets/main/hunger.png";
    
    swal({
        title: 'Welcome to the restaurant!',
        icon: iconUrl,
        content: {
        element: 'input', 
        attributes: {placeholder: 'Table Number?', type: 'number', min : 1}},
        closeOnClickOutside: false
    }).then((inputValue) => tableNumber = inputValue)  
  },

  handleMarkerFound: function(dishes, markerId) {
    // Getting today's day
    var todaysDate = new Date();
    var todaysDay = todaysDate.getDay();
    // Sunday - Saturday : 0 - 6
    var days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday"
    ];

    var dish = dishes.filter(dish => dish.id === markerId)[0];

    var model = document.querySelector(`#model-${dish.id}`)
    model.setAttribute('visible', true)

    var ingContainer = document.querySelector(`#main-plane-${dish.id}`)
    ingContainer.setAttribute('visible', true)

    var priceContainer = document.querySelector(`#price-plane-${dish.id}`)
    priceContainer.setAttribute('visible', true)

    if (dish.unavailable_days.includes(days[todaysDay])) {
      swal({
        icon: "warning",
        title: dish.dishName.toUpperCase(),
        text: "This dish is not available today!!!",
        timer: 2500,
        buttons: false
      });
    } else {
       // Changing Model scale to initial scale
      var model = document.querySelector(`#model-${dish.id}`);
      model.setAttribute("position", dish.modelGeometry.position);
      model.setAttribute("rotation", dish.modelGeometry.rotation);
      model.setAttribute("scale", dish.modelGeometry.scale);

      // Changing button div visibility
      var buttonDiv = document.getElementById("button-div");
      buttonDiv.style.display = "flex";

      var ratingButton = document.getElementById("rating-button");
      var orderButtton = document.getElementById("order-button");
      var orderSummaryButton = document.getElementById('order-summary')
      var payButton = document.getElementById('pay-button')

      // Handling Click Events
      ratingButton.addEventListener("click", function() {
       this.handleRatings(dish)
      });

      orderButtton.addEventListener("click", () => {

        var tNumber
        tNumber <= 9 ? (tNumber = `T0${tableNumber}`) : ( tNumber =  `T${tableNumber}`)

        this.handleOrder(tNumber, dish)

        swal({
          title: "Thanks For Order !",
          text: "Your order will serve soon on your table!",
          timer: 2000,
          buttons: false
        });
      });

      orderSummaryButton.addEventListener('click', () => {
        this.handleOrderSummary()
      })

      payButton.addEventListener('click', () => {
        this.handlePayment()
      })
    }
  },

  handleRatings: async function(dish){
    var tNumber
    tNumber <= 9 ? (tNumber = `T0${tableNumber}`) : ( tNumber =  `T${tableNumber}`)

    var orderSummary = await this.getOrderSummary(tNumber)

    var currentOrder = Object.keys(orderSummary.current_orders)

    if(currentOrder.length > 0 && currentOrder == dish.id){
      document.getElementById('rating-modal-div').style.display = 'flex';
      document.getElementById('rating-input').value = '0';
      document.getElementById('feedback-input').value = '';
      
      var saveRatingButton = document.getElementById('save-rating-button')
      saveRatingButton.addEventListener('click', () => {
        document.getElementById('rating-modal-div').style.display = 'none';
        
        var rating = document.getElementById('rating-input').value
        var feedback = document.getElementById('feedback-input').value
        
        firebase.firestore().collection('dishes').doc(dish.id).update({
          last_review: feedback,
          last_rating: rating
        }).then(() => {
          swal({
            icon: 'success',
            title: 'Thanks For Rating!!',
            text: 'We hope you liked the dish',
            buttons: false,
            timer: 2500
          })
        })
      })
    }

    else{
      swal({
        icon: 'warning',
        title: 'Oops!',
        text: 'No dish found to give ratings',
        timer: 2500,
        buttons: false
      })
    }
  },

  handleOrder: function(tNumber, dish) {

    firebase.firestore().collection('tables').doc(tNumber).get().then(doc => {
      var details = doc.data()

      if(details['CurrentOrders'][dish.id]){
        details['CurrentOrder'][dish.id]['quantity'] += 1

        var currentQuantity = details['CurrentOrders'][dish.id]['quantity']
        details['CurrentOrders'][dish.id]['subtotal'] = currentQuantity + dish.price

      }
      else{
        details['CurrentOrders'][dish.id] = {
          item: dish.dishName,
          price: dish.price,
          quantity: 1,
          subtotal: dish.price * 1
        }
      }
      details.totalBill += dish.price

      firebase.firestore().collection('tables').doc(doc.id).update(details)

    })

  },

  getDishes: async function() {
    return await firebase
      .firestore()
      .collection("dishes")
      .get()
      .then(snap => {
        return snap.docs.map(doc => doc.data());
      });
  },
  handleMarkerLost: function() {
    // Changing button div visibility
    var buttonDiv = document.getElementById("button-div");
    buttonDiv.style.display = "none";
  },

  handleOrderSummary: async function(){
    var tNumber
     tNumber <= 9 ? (tNumber = `T0${tableNumber}`) : ( tNumber =  `T${tableNumber}`)

    var orderSummary = await this.getOrderSummary(tNumber)

    var modalDiv = document.getElementById('modal-div')
    modalDiv.style.display = 'flex'

    var tableBodyTag = document.getElementById('bill-table-body')
    tableBodyTag.innerHTML = ''

    var currentOrder = Object.keys(orderSummary.currentOrders)

    currentOrder.map((i) => {
      var tr = document.createElement('tr')
      var item = document.createElement('td')
      var price = document.createElement('td')
      var quantity = document.createElement('td')
      var subtotal = document.createElement('td')

      item.innerHTML = orderSummary.currentOrders[i].item
      price.innerHTML = orderSummary.currentOrders[i].price
      price.setAttribute('class', 'text-centre')
      quantity.innerHTML = orderSummary.currentOrders[i].quantity
      quantity.setAttribute('class', 'text-centre')
      subtotal.innerHTML = `$ ${orderSummary.currentOrders[i].subtotal}`
      subtotal.setAttribute('class', 'text-centre')

      tr.appendChild(item)
      tr.appendChild(price)
      tr.appendChild(quantity)
      tr.appendChild(subtotal)

      tableBodyTag.appendChild(tr)
    })

    var totalTr = document.createElement('tr')
    var totalTd1 = document.createElement('td')
    totalTd1.setAttribute('class', 'no-line')
    var totalTd2 = document.createElement('td')
    totalTd2.setAttribute('class', 'no-line')
    var totalTd3 = document.createElement('td')
    totalTd3.setAttribute('class', 'no-line text-centre')

    var strong = document.createElement('strong')
    strong.innerHTML = 'TOTAL'
    totalTd3.appendChild(strong)

    var totalTd4 = document.createElement('td')
    totalTd4.setAttribute('class', 'no-line text-right')
    totalTd4.innerHTML = `$ ${orderSummary.totalBill}`

    totalTr.appendChild(totalTd1)
    totalTr.appendChild(totalTd2)
    totalTr.appendChild(totalTd3)
    totalTr.appendChild(totalTd4)

    tableBodyTag.appendChild(totalTr)
  },

  getOrderSummary: async function(tNo){
    return await firebase.firestore().collection('tables').doc(tNo).get().then(doc => doc.data())
  },

  handlePayment: function(){
    document.getElementById('modal-div').style.display = 'none'

    var tNumber
    tNumber <= 9 ? (tNumber = `T0${tableNumber}`) : ( tNumber =  `T${tableNumber}`)

    firebase.firestore().collection('tables').doc(tNumber).update({
      currentOrders: {},
      totalBill: 0
    })
    .then(() => {
      swal({
        icon: 'success',
        title: 'Thanks for Paying!',
        text: 'We hope you enjoyed the food! Please visit us again!',
        timer: 2500,
        buttons: false,
      })
    })
  }
});