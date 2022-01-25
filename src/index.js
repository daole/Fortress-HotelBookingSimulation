function processRequest(request, reservations, rooms) {
    const availableRooms = rooms.filter(room =>
        // Whenever a guest requests a single, you may assign them to a double bed. When a guest requests a double, however, you must assign them a double
        request.min_beds <= room.num_beds

        // Do not put smokers in non-smoking rooms and do not put non-smokers in smoking rooms
        && request.is_smoker == room.allow_smoking

        // When a room is reserved, it cannot be reserved by another guest on overlapping dates
        && isRoomAvailable(room.id, request.checkin_date, request.checkout_date, reservations)
    );
    if (availableRooms.length > 0) {
        // Whenever there are multiple available rooms for a request, assign the room with the lower final price
        let numberOfDays = calculateDayDifference(request.checkin_date, request.checkout_date);
        availableRooms.sort((room1, room2) => calculateFinalRentalFee(room1.daily_rate, numberOfDays, room1.cleaning_fee) - calculateFinalRentalFee(room2.daily_rate, numberOfDays, room2.cleaning_fee));
        return {
            room_id: availableRooms[0].id,
            checkin_date: request.checkin_date,
            checkout_date: request.checkout_date,
            total_charge: calculateFinalRentalFee(availableRooms[0].daily_rate, numberOfDays, availableRooms[0].cleaning_fee)
        };
    } else {
        return null;
    }
}

function isRoomAvailable(roomId, checkinDate, checkoutDate, reservations) {
    let overlappedReservation = reservations.find(reservation =>
        roomId == reservation.room_id
        && !(
            new Date(checkinDate) >= new Date(reservation.checkout_date)
            || new Date(checkoutDate) <= new Date(reservation.checkin_date)
        )
    );
    return overlappedReservation == null;
}

function calculateDayDifference(checkinDate, checkoutDate) {
    return (new Date(checkoutDate) - new Date(checkinDate)) / 86400000; // 24h * 60m * 60s * 1000ms
}

function calculateFinalRentalFee(dailyRate, numberOfDays, cleaningFee) {
    return dailyRate * numberOfDays + cleaningFee;
}

function main() {
    let answers = require('./json/answers.json');
    let requests = require('./json/requests.json');
    let reservations = require('./json/reservations.json');
    let rooms = require('./json/rooms.json');

    requests.forEach(request => {
        let reservation = processRequest(request, reservations, rooms);
        if (reservation) {
            reservations.push(reservation);
        } else {
            console.log('There is no room that can satisty the request', request);
        }
    });

    // Validate final results
    console.log('Final reservation list', reservations);
    if (reservations.length == answers.length) {
        for (let i = 0; i < reservations.length; i ++) {
            let reservation = reservations[i];
            let answer = answers[i];
            if (
                reservation.room_id != answer.room_id
                || reservation.checkin_date != answer.checkin_date
                || reservation.checkout_date != answer.checkout_date
                || reservation.total_charge != answer.total_charge
            ) {
                console.log(`Did not pass! Unmatched element at index ${i}!`);
                return;
            }
        }
        console.log('Passed!');
    } else {
        console.log('Did not pass! Lengths of reservations and answers do not match!');
    }
}

main();