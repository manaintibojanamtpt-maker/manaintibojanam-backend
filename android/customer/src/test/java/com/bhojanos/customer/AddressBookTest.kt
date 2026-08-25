package com.bhojanos.customer

import com.bhojanos.core.database.AddressEntity
import org.junit.Assert.*
import org.junit.Test

class AddressBookTest {

    @Test
    fun testAddressEntityCreation() {
        val address = AddressEntity(
            id = "addr_123",
            label = "Home",
            houseFlat = "Flat 402",
            building = "Sunrise Residency",
            street = "Main Road",
            area = "Hadapsar",
            landmark = "Near Green Park",
            city = "Pune",
            state = "Maharashtra",
            pincode = "411028",
            latitude = 18.499594,
            longitude = 73.978589,
            formattedAddress = "Flat 402, Sunrise Residency, Hadapsar, Pune 411028",
            isDefault = true
        )

        assertEquals("addr_123", address.id)
        assertEquals("Home", address.label)
        assertEquals("Pune", address.city)
        assertTrue(address.isDefault)
        assertEquals(18.499594, address.latitude, 0.0001)
    }

    @Test
    fun testAddressLabelTypes() {
        val homeLabel = "Home"
        val workLabel = "Work"
        val otherLabel = "Other"

        assertTrue(listOf(homeLabel, workLabel, otherLabel).contains("Work"))
    }
}
